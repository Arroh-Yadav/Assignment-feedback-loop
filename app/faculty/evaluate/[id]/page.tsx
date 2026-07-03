"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

interface Annotation {
  id: string;
  pageNumber: number;
  type: string;
  coordinates: { x: number; y: number };
  content: string;
}

interface Evaluation {
  id: string;
  finalMarks: number;
  facultyRemarks: string;
  status: string;
  annotations: Annotation[];
}

interface AIFeedbackItem {
  type: "correct" | "error" | "warning";
  message: string;
}

interface AIFeedbackData {
  extractedText: string;
  structuralAnalysis: string[];
  feedbackItems: AIFeedbackItem[];
  suggestedMarks: number;
  modelUsed: string;
  generatedAt: string;
}

interface Submission {
  id: string;
  fileUrls: string[];
  pageCount: number;
  studentNote: string | null;
  status: string;
  student: { fullName: string; enrollmentNumber: string };
  assignment: {
    id: string;
    title: string;
    subjectName: string;
    maxMarks: number;
    description: string;
  };
  evaluation: Evaluation | null;
}

type AnnotationTool = "comment" | "highlight" | null;

export default function EvaluatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  // AI feedback
  const [aiFeedback, setAiFeedback] = useState<AIFeedbackData | null>(null);
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState(true);
  const [showAiPanel, setShowAiPanel] = useState(true);

  // Page navigation
  const [currentPage, setCurrentPage] = useState(0);

  // Annotation state
  const [activeTool, setActiveTool] = useState<AnnotationTool>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pendingAnnotation, setPendingAnnotation] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [annotationComment, setAnnotationComment] = useState("");
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<Annotation | null>(null);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);

  // Evaluation form
  const [finalMarks, setFinalMarks] = useState("");
  const [facultyRemarks, setFacultyRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/faculty/submissions/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const sub = data.submission;
        setSubmission(sub);
        if (sub?.evaluation) {
          setFinalMarks(String(sub.evaluation.finalMarks));
          setFacultyRemarks(sub.evaluation.facultyRemarks);
          setAnnotations(sub.evaluation.annotations ?? []);
          setEvaluationId(sub.evaluation.id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`/api/ai/feedback/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.aiFeedback) {
          setAiFeedback(data.aiFeedback);
          // Pre-fill marks with AI suggestion, but only if faculty hasn't
          // already saved their own marks in a draft evaluation.
          setFinalMarks((prev) =>
            prev ? prev : String(data.aiFeedback.suggestedMarks),
          );
        }
        setAiFeedbackLoading(false);
      })
      .catch(() => setAiFeedbackLoading(false));
  }, [id]);

  const isPublished = submission?.evaluation?.status === "PUBLISHED";
  const currentPageAnnotations = annotations.filter(
    (a) => a.pageNumber === currentPage + 1,
  );

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool || isPublished) return;
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingAnnotation({ x, y });
    setAnnotationComment("");
  };

  const handleSaveAnnotation = async () => {
    if (!pendingAnnotation || !annotationComment.trim()) return;
    if (!evaluationId) {
      // Need to save draft first
      setError("Please save as draft first before adding annotations.");
      setPendingAnnotation(null);
      return;
    }

    try {
      const res = await fetch("/api/faculty/annotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluationId,
          pageNumber: currentPage + 1,
          type: activeTool === "highlight" ? "HIGHLIGHT" : "COMMENT",
          coordinates: pendingAnnotation,
          content: annotationComment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      const newAnnotation: Annotation = {
        id: data.annotationId,
        pageNumber: currentPage + 1,
        type: activeTool === "highlight" ? "HIGHLIGHT" : "COMMENT",
        coordinates: pendingAnnotation,
        content: annotationComment.trim(),
      };
      setAnnotations((prev) => [...prev, newAnnotation]);
      setPendingAnnotation(null);
      setAnnotationComment("");
    } catch {
      setError("Failed to save annotation.");
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      await fetch("/api/faculty/annotate", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annotationId }),
      });
      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
      setSelectedAnnotation(null);
    } catch {
      setError("Failed to delete annotation.");
    }
  };

  const handleSave = async (publish: boolean) => {
    setError("");
    setSuccessMsg("");

    if (!finalMarks || !facultyRemarks.trim()) {
      setError("Please enter marks and remarks before saving.");
      return;
    }
    if (
      Number(finalMarks) < 0 ||
      Number(finalMarks) > (submission?.assignment.maxMarks ?? 100)
    ) {
      setError(
        `Marks must be between 0 and ${submission?.assignment.maxMarks}.`,
      );
      return;
    }

    if (publish) {
      setPublishing(true);
    } else {
      setSaving(true);
    }

    try {
      const res = await fetch("/api/faculty/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: id,
          finalMarks: Number(finalMarks),
          facultyRemarks: facultyRemarks.trim(),
          publish,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setSaving(false);
        setPublishing(false);
        return;
      }

      if (!evaluationId) setEvaluationId(data.evaluationId);

      if (publish) {
        router.push(`/faculty/assignments/${submission?.assignment.id}`);
      } else {
        setSuccessMsg("Draft saved successfully.");
        setSaving(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setSaving(false);
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <p className="text-white/40 text-sm">Loading submission...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <p className="text-white/40 text-sm">Submission not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#1a1a2e" }}>
      {/* Top Bar */}
      <div
        className="px-6 py-4 flex items-center gap-3 shadow-lg"
        style={{ backgroundColor: "#8B1A1A" }}
      >
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold" style={{ color: "#8B1A1A" }}>
            IPS
          </span>
        </div>
        <div className="flex-1">
          <p className="text-white text-sm font-medium">
            {submission.assignment.title}
          </p>
          <p className="text-white/60 text-xs">
            {submission.student.fullName} ·{" "}
            {submission.student.enrollmentNumber}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-white/60 text-xs hover:text-white transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Split Layout */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* LEFT PANEL — Image Viewer */}
        <div
          className="flex-1 flex flex-col"
          style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Page Navigation */}
          <div
            className="px-4 py-2.5 flex items-center justify-between"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "#0f0f23",
            }}
          >
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-30 transition-all"
              style={{
                backgroundColor: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              ← Prev
            </button>
            <p className="text-white/50 text-xs">
              Page {currentPage + 1} of {submission.pageCount}
              {currentPageAnnotations.length > 0 && (
                <span className="ml-2 text-white/30">
                  · {currentPageAnnotations.length} annotation
                  {currentPageAnnotations.length !== 1 ? "s" : ""}
                </span>
              )}
            </p>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(submission.pageCount - 1, p + 1))
              }
              disabled={currentPage === submission.pageCount - 1}
              className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-30 transition-all"
              style={{
                backgroundColor: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Next →
            </button>
          </div>

          {/* Image with Annotations */}
          <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
            <div
              ref={imageRef}
              className="relative inline-block"
              style={{
                cursor: activeTool && !isPublished ? "crosshair" : "default",
              }}
              onClick={handleImageClick}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={submission.fileUrls[currentPage]}
                alt={`Page ${currentPage + 1}`}
                className="max-w-full rounded-lg shadow-xl"
                style={{ maxHeight: "calc(100vh - 200px)", userSelect: "none" }}
              />

              {/* Annotation Dots */}
              {currentPageAnnotations.map((ann, index) => (
                <button
                  key={ann.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAnnotation(
                      selectedAnnotation?.id === ann.id ? null : ann,
                    );
                  }}
                  className="absolute w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg transition-transform hover:scale-110"
                  style={{
                    left: `${ann.coordinates.x}%`,
                    top: `${ann.coordinates.y}%`,
                    transform: "translate(-50%, -50%)",
                    backgroundColor:
                      ann.type === "HIGHLIGHT" ? "#F59E0B" : "#8B1A1A",
                    zIndex: 10,
                  }}
                >
                  {index + 1}
                </button>
              ))}

              {/* Pending Annotation Dot */}
              {pendingAnnotation && (
                <div
                  className="absolute w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg animate-pulse"
                  style={{
                    left: `${pendingAnnotation.x}%`,
                    top: `${pendingAnnotation.y}%`,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "#6B7280",
                    zIndex: 10,
                  }}
                >
                  ?
                </div>
              )}
            </div>
          </div>

          {/* Selected Annotation Popup */}
          {selectedAnnotation && (
            <div
              className="mx-4 mb-2 p-3 rounded-xl flex items-start justify-between gap-3"
              style={{
                backgroundColor: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <div className="flex-1">
                <p className="text-white/40 text-xs mb-1">
                  {selectedAnnotation.type === "HIGHLIGHT"
                    ? "🟡 Highlight"
                    : "💬 Comment"}{" "}
                  — Page {selectedAnnotation.pageNumber}
                </p>
                <p className="text-white text-sm">
                  {selectedAnnotation.content}
                </p>
              </div>
              {!isPublished && (
                <button
                  onClick={() => handleDeleteAnnotation(selectedAnnotation.id)}
                  className="text-red-400 text-xs hover:text-red-300 flex-shrink-0"
                >
                  Delete
                </button>
              )}
            </div>
          )}

          {/* Pending Annotation Input */}
          {pendingAnnotation && (
            <div
              className="mx-4 mb-2 p-3 rounded-xl space-y-2"
              style={{
                backgroundColor: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <p className="text-white/40 text-xs">Add annotation comment</p>
              <input
                type="text"
                placeholder="Type your comment..."
                value={annotationComment}
                onChange={(e) => setAnnotationComment(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 outline-none"
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveAnnotation();
                  if (e.key === "Escape") setPendingAnnotation(null);
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingAnnotation(null)}
                  className="flex-1 py-1.5 rounded-lg text-xs"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAnnotation}
                  className="flex-1 py-1.5 rounded-lg text-white text-xs font-medium"
                  style={{ backgroundColor: "#8B1A1A" }}
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Annotation Toolbar */}
          {!isPublished && (
            <div
              className="px-4 py-3 flex items-center gap-2"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: "#0f0f23",
              }}
            >
              <p className="text-white/30 text-xs mr-2">Annotate:</p>
              {[
                { tool: "comment" as AnnotationTool, label: "💬 Comment" },
                { tool: "highlight" as AnnotationTool, label: "🟡 Highlight" },
              ].map(({ tool, label }) => (
                <button
                  key={tool}
                  onClick={() =>
                    setActiveTool(activeTool === tool ? null : tool)
                  }
                  className="px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{
                    backgroundColor:
                      activeTool === tool
                        ? "#8B1A1A"
                        : "rgba(255,255,255,0.07)",
                    color:
                      activeTool === tool ? "#fff" : "rgba(255,255,255,0.5)",
                    border:
                      activeTool === tool
                        ? "1px solid #8B1A1A"
                        : "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {label}
                </button>
              ))}
              {activeTool && (
                <p className="text-white/20 text-xs ml-2">
                  Click on the image to annotate
                </p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL — Evaluation Form */}
        <div
          className="w-80 flex flex-col overflow-auto"
          style={{ backgroundColor: "#0f0f23" }}
        >
          <div className="p-5 space-y-5 flex-1">
            {/* Student Note */}
            {submission.studentNote && (
              <div
                className="p-3 rounded-xl"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-white/40 text-xs mb-1">Student Note</p>
                <p className="text-white/70 text-sm">
                  {submission.studentNote}
                </p>
              </div>
            )}

            {/* Assignment Brief */}
            <div>
              <p className="text-white/40 text-xs mb-1">Assignment</p>
              <p className="text-white text-sm font-medium">
                {submission.assignment.title}
              </p>
              <p className="text-white/40 text-xs mt-0.5">
                {submission.assignment.subjectName}
              </p>
            </div>

            {/* AI Feedback */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <button
                onClick={() => setShowAiPanel((prev) => !prev)}
                className="w-full flex items-center justify-between px-3.5 py-3"
              >
                <div className="flex items-center gap-2">
                  {!aiFeedbackLoading &&
                    aiFeedback &&
                    submission.status !== "AI_ERROR" && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: "#10B981" }}
                      />
                    )}
                  <span className="text-white text-sm font-medium">
                    AI Feedback
                  </span>
                  {aiFeedback && (
                    <span className="text-white/30 text-xs">
                      Generated by {aiFeedback.modelUsed} ·{" "}
                      {new Date(aiFeedback.generatedAt).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </span>
                  )}
                </div>
                <span className="text-white/40 text-xs">
                  {showAiPanel ? "▲" : "▼"}
                </span>
              </button>

              {showAiPanel && (
                <div className="px-3.5 pb-3.5 space-y-2.5">
                  {/* Loading state — still queued/processing */}
                  {(submission.status === "SUBMITTED" ||
                    submission.status === "AI_PROCESSING" ||
                    (aiFeedbackLoading && !aiFeedback)) &&
                    submission.status !== "AI_ERROR" && (
                      <div className="flex items-center gap-2 py-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full border-2 border-white/20 animate-spin"
                          style={{ borderTopColor: "#8B5CF6" }}
                        />
                        <p className="text-white/40 text-xs">
                          AI is still analyzing this submission — check back in
                          a moment.
                        </p>
                      </div>
                    )}

                  {/* Error state */}
                  {submission.status === "AI_ERROR" && (
                    <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-red-400 text-xs">
                        AI processing failed for this submission. You can still
                        evaluate it manually below.
                      </p>
                    </div>
                  )}

                  {/* Loaded feedback */}
                  {aiFeedback && submission.status !== "AI_ERROR" && (
                    <>
                      <div className="space-y-1.5">
                        {aiFeedback.feedbackItems.map((item, i) => {
                          const style =
                            item.type === "correct"
                              ? {
                                  bg: "rgba(16,185,129,0.08)",
                                  border: "rgba(16,185,129,0.3)",
                                  text: "#10B981",
                                  prefix: "✓",
                                }
                              : item.type === "error"
                                ? {
                                    bg: "rgba(239,68,68,0.08)",
                                    border: "rgba(239,68,68,0.3)",
                                    text: "#EF4444",
                                    prefix: "✗",
                                  }
                                : {
                                    bg: "rgba(245,158,11,0.08)",
                                    border: "rgba(245,158,11,0.3)",
                                    text: "#F59E0B",
                                    prefix: "△",
                                  };
                          return (
                            <div
                              key={i}
                              className="px-2.5 py-2 rounded-lg text-xs"
                              style={{
                                backgroundColor: style.bg,
                                border: `1px solid ${style.border}`,
                                color: "rgba(255,255,255,0.8)",
                              }}
                            >
                              <span
                                className="font-bold mr-1.5"
                                style={{ color: style.text }}
                              >
                                {style.prefix}
                              </span>
                              {item.message}
                            </div>
                          );
                        })}
                      </div>

                      <div
                        className="px-3 py-2 rounded-lg flex items-center justify-between"
                        style={{ backgroundColor: "rgba(139,92,246,0.1)" }}
                      >
                        <span className="text-white/60 text-xs">
                          AI Suggested Marks
                        </span>
                        <span
                          className="text-sm font-bold"
                          style={{ color: "#8B5CF6" }}
                        >
                          {aiFeedback.suggestedMarks} /{" "}
                          {submission.assignment.maxMarks}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Marks Input */}
            <div>
              <label className="text-white/50 text-xs block mb-1">
                Marks Awarded{" "}
                <span className="text-white/30">
                  (out of {submission.assignment.maxMarks})
                </span>
              </label>
              <input
                type="number"
                placeholder="0"
                value={finalMarks}
                onChange={(e) => setFinalMarks(e.target.value)}
                min={0}
                max={submission.assignment.maxMarks}
                disabled={isPublished}
                className="w-full px-3 py-2.5 rounded-lg text-white text-lg font-bold outline-none disabled:opacity-50"
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
              {finalMarks && (
                <p className="text-white/30 text-xs mt-1 text-right">
                  {(
                    (Number(finalMarks) / submission.assignment.maxMarks) *
                    100
                  ).toFixed(1)}
                  %
                </p>
              )}
            </div>

            {/* Remarks */}
            <div>
              <label className="text-white/50 text-xs block mb-1">
                Faculty Remarks
              </label>
              <textarea
                placeholder="Write detailed feedback for the student..."
                value={facultyRemarks}
                onChange={(e) => setFacultyRemarks(e.target.value)}
                rows={6}
                disabled={isPublished}
                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 outline-none resize-none disabled:opacity-50"
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            </div>

            {/* Annotations Summary */}
            {annotations.length > 0 && (
              <div>
                <p className="text-white/40 text-xs mb-2">
                  Annotations ({annotations.length})
                </p>
                <div className="space-y-1.5">
                  {annotations.map((ann, index) => (
                    <div
                      key={ann.id}
                      className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg"
                      style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                    >
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0 mt-0.5"
                        style={{
                          backgroundColor:
                            ann.type === "HIGHLIGHT" ? "#F59E0B" : "#8B1A1A",
                        }}
                      >
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/30 text-xs">
                          P{ann.pageNumber}
                        </p>
                        <p className="text-white/70 text-xs truncate">
                          {ann.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error / Success */}
            {error && (
              <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
            {successMsg && (
              <div className="px-3 py-2.5 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-green-400 text-xs">{successMsg}</p>
              </div>
            )}

            {/* Published State */}
            {isPublished && (
              <div className="px-3 py-2.5 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-green-400 text-xs font-medium">
                  ✓ Published — student can now view feedback
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!isPublished && (
            <div
              className="p-4 space-y-2"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
            >
              <button
                onClick={() => handleSave(false)}
                disabled={saving || publishing}
                className="w-full py-2.5 rounded-lg text-sm transition-all disabled:opacity-60"
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving || publishing}
                className="w-full py-3 rounded-lg text-white text-sm font-medium disabled:opacity-60"
                style={{ backgroundColor: "#8B1A1A" }}
              >
                {publishing ? "Publishing..." : "Approve & Publish →"}
              </button>
              <p className="text-white/20 text-xs text-center">
                Publishing is permanent. Student will see feedback immediately.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
