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
  hasReferenceFile: boolean;
}): string {
  // Prompt template per TRD.md section 4 ("Evaluation Prompt Template"),
  // adapted to the live Assignment fields (subjectName, maxMarks, description),
  // plus an added reference-material comparison step when the faculty has
  // uploaded a question paper / answer key (assignment.referenceFileUrl).
  return `
You are an engineering assignment evaluator for IPS Academy, Indore.

Assignment: ${assignment.title}
Subject: ${assignment.subjectName}
Max Marks: ${assignment.maxMarks}
Evaluation Criteria: ${assignment.description}

${
  assignment.hasReferenceFile
    ? `You are given two sets of material, clearly labeled below:
1. Reference material (the question paper and/or expected answers)
2. The student's submitted handwritten answer sheet

First, identify the exact questions asked (and expected answers/approach, if
shown) from the reference material. Then evaluate the student's submission
specifically against those questions: check whether each question was
attempted, whether the answer matches the expected approach/result, and
explicitly flag any questions that were left unanswered.`
    : `The student has submitted handwritten pages.`
}

Analyze the submission and:
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
 *
 * If referenceImages is non-empty, they're sent first with a clear label,
 * followed by a label + the student's submission images -- so Gemini can
 * tell the two sets apart unambiguously.
 */
async function callGemini(
  prompt: string,
  submissionImages: { base64: string; mimeType: string }[],
  referenceImages: { base64: string; mimeType: string }[] = [],
): Promise<GeminiEvaluationResult> {
  const toInlinePart = (img: { base64: string; mimeType: string }) => ({
    inlineData: { mimeType: img.mimeType, data: img.base64 },
  });

  const parts: (
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  )[] = [{ text: prompt }];

  if (referenceImages.length > 0) {
    parts.push({ text: "Reference material (question paper / answer key):" });
    parts.push(...referenceImages.map(toInlinePart));
    parts.push({ text: "Student's submitted answer sheet:" });
  }
  parts.push(...submissionImages.map(toInlinePart));

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: "user", parts }],
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
    include: {
      assignment: { include: { faculty: { select: { userId: true } } } },
    },
  });

  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  try {
    const images = await Promise.all(
      submission.fileUrls.map((url: string) => fetchImageAsBase64(url)),
    );

    const referenceFileUrl = submission.assignment.referenceFileUrl;
    let referenceImages: { base64: string; mimeType: string }[] = [];
    if (referenceFileUrl) {
      try {
        referenceImages = [await fetchImageAsBase64(referenceFileUrl)];
      } catch (refError) {
        console.warn(
          `Failed to fetch reference file for submission ${submissionId}, ` +
            `proceeding with text-only evaluation criteria:`,
          refError,
        );
      }
    }

    const prompt = buildEvaluationPrompt({
      title: submission.assignment.title,
      subjectName: submission.assignment.subjectName,
      maxMarks: submission.assignment.maxMarks,
      description: submission.assignment.description,
      hasReferenceFile: referenceImages.length > 0,
    });

    let result: GeminiEvaluationResult;
    try {
      result = await callGemini(prompt, images, referenceImages);
    } catch (firstError) {
      console.warn(
        `Gemini call failed for submission ${submissionId}, retrying once:`,
        firstError,
      );
      result = await callGemini(prompt, images, referenceImages);
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

    // Notify the faculty that AI feedback is ready for review.
    // Wrapped separately: a notification failure must never flip this
    // submission to AI_ERROR when AI processing itself succeeded.
    try {
      await prisma.notification.create({
        data: {
          userId: submission.assignment.faculty.userId,
          title: "Submission Ready to Evaluate",
          message: `AI feedback is ready for a submission on "${submission.assignment.title}".`,
          linkUrl: `/faculty/evaluate/${submissionId}`,
        },
      });
    } catch (notifError) {
      console.error(
        `Failed to create AI_DONE notification for submission ${submissionId} (non-fatal):`,
        notifError,
      );
    }
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
