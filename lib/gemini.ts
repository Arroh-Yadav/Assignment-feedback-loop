import { GoogleGenAI } from "@google/genai";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/supabase";

// ── Model ─────────────────────────────────────
// NOTE: Implementation-Plan.md / TRD.md originally specified `gemini-1.5-pro`
// via the `@google/generative-ai` package. Both are fully shut down as of
// mid-2026 (all requests 404). Swapped to the current GA multimodal model,
// `gemini-3.5-flash`, via the actively-maintained `@google/genai` SDK.
// See handoff notes / Implementation-Plan.md Phase 3 changelog.
const MODEL_NAME = "gemini-3.5-flash";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ── Types ─────────────────────────────────────
interface GeminiFeedbackItem {
  type: "correct" | "error" | "warning";
  message: string;
}

interface GeminiEvaluationResult {
  extracted_text: string;
  structural_analysis: string[];
  feedback_items: GeminiFeedbackItem[];
  suggested_marks: number;
}

// ── Helpers ───────────────────────────────────

/**
 * Fetches an image from a Cloudinary URL and returns base64 + mime type,
 * ready to hand to Gemini as inline image data.
 */
async function fetchImageAsBase64(
  url: string,
): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image at ${url}: ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return { base64, mimeType: contentType };
}

function buildEvaluationPrompt(assignment: {
  title: string;
  subjectName: string;
  maxMarks: number;
  description: string;
}): string {
  // Prompt template per TRD.md section 4 ("Evaluation Prompt Template"),
  // adapted to the live Assignment fields (subjectName, maxMarks, description).
  return `
You are an engineering assignment evaluator for IPS Academy, Indore.

Assignment: ${assignment.title}
Subject: ${assignment.subjectName}
Max Marks: ${assignment.maxMarks}
Evaluation Criteria: ${assignment.description}

The student has submitted handwritten pages. Analyze each page and:
1. Extract all written text, formulas, and diagram labels
2. Check if the solution follows the correct method/structure
3. Identify correct steps, errors, and missing parts
4. Generate step-by-step feedback for the student
5. Suggest a mark out of ${assignment.maxMarks}

Respond ONLY in this JSON format with no extra text, no markdown code fences:
{
  "extracted_text": "full extracted text here",
  "structural_analysis": ["step 1 observation", "step 2 observation"],
  "feedback_items": [
    { "type": "correct", "message": "..." },
    { "type": "error",   "message": "..." },
    { "type": "warning", "message": "..." }
  ],
  "suggested_marks": 0
}
`.trim();
}

/**
 * Strips markdown code fences (```json ... ```) that Gemini sometimes wraps
 * JSON responses in, despite being told not to.
 */
function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function parseGeminiResponse(rawText: string): GeminiEvaluationResult {
  const cleaned = stripCodeFences(rawText);
  const parsed = JSON.parse(cleaned);

  if (
    typeof parsed.extracted_text !== "string" ||
    !Array.isArray(parsed.structural_analysis) ||
    !Array.isArray(parsed.feedback_items) ||
    typeof parsed.suggested_marks !== "number"
  ) {
    throw new Error("Gemini response missing required fields");
  }

  return parsed as GeminiEvaluationResult;
}

/**
 * Calls Gemini once with the given prompt + images, parses the JSON result.
 * Throws on failure (caller decides whether to retry).
 */
async function callGemini(
  prompt: string,
  images: { base64: string; mimeType: string }[],
): Promise<GeminiEvaluationResult> {
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          ...images.map((img) => ({
            inlineData: {
              mimeType: img.mimeType,
              data: img.base64,
            },
          })),
        ],
      },
    ],
  });

  const rawText = response.text ?? "";
  if (!rawText) {
    throw new Error("Gemini returned an empty response");
  }

  return parseGeminiResponse(rawText);
}

// ── Main entry point ──────────────────────────

/**
 * Processes a single submission end-to-end:
 * fetch submission + assignment -> fetch page images -> call Gemini ->
 * save AIFeedback -> update submission status.
 *
 * Retries the Gemini call once if the JSON response is malformed.
 * On total failure, marks the submission status as AI_ERROR.
 */
export async function processSubmission(submissionId: string): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: true },
  });

  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  try {
    const images = await Promise.all(
      submission.fileUrls.map((url: string) => fetchImageAsBase64(url)),
    );

    const prompt = buildEvaluationPrompt({
      title: submission.assignment.title,
      subjectName: submission.assignment.subjectName,
      maxMarks: submission.assignment.maxMarks,
      description: submission.assignment.description,
    });

    let result: GeminiEvaluationResult;
    try {
      result = await callGemini(prompt, images);
    } catch (firstError) {
      console.warn(
        `Gemini call failed for submission ${submissionId}, retrying once:`,
        firstError,
      );
      result = await callGemini(prompt, images);
    }

    await prisma.aIFeedback.upsert({
      where: { submissionId },
      create: {
        submissionId,
        extractedText: result.extracted_text,
        structuralAnalysis: result.structural_analysis,
        feedbackItems:
          result.feedback_items as unknown as Prisma.InputJsonValue,
        suggestedMarks: result.suggested_marks,
        modelUsed: MODEL_NAME,
      },
      update: {
        extractedText: result.extracted_text,
        structuralAnalysis: result.structural_analysis,
        feedbackItems:
          result.feedback_items as unknown as Prisma.InputJsonValue,
        suggestedMarks: result.suggested_marks,
        modelUsed: MODEL_NAME,
        generatedAt: new Date(),
      },
    });

    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "AI_DONE" },
    });
  } catch (error) {
    console.error(
      `AI processing failed for submission ${submissionId}:`,
      error,
    );
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "AI_ERROR" },
    });
    throw error;
  }
}
