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

interface Submission {
  id: string;
  fileUrls: string[];
  pageCount: number;
  submittedAt: string;
  status: string;
  assignment: {
    title: string;
    subjectName: string;
    maxMarks: number;
    description: string;
  };
  evaluation: {
    id: string;
    finalMarks: number;
    facultyRemarks: string;
    status: string;
    evaluatedAt: string;
    publishedAt: string;
    annotations: Annotation[];
    faculty: { fullName: string };
  };
}

export default function StudentFeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const imageRef = useRef<HTMLDivElement>(null);

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<Annotation | null>(null);

  useEffect(() => {
    fetch(`/api/student/feedback/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSubmission(data.submission);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Something went wrong.");
        setLoading(false);
      });
  }, [id]);

  const currentPageAnnotations =
    submission?.evaluation.annotations.filter(
      (a) => a.pageNumber === currentPage + 1,
    ) ?? [];

  const percentage = submission
    ? (
        (submission.evaluation.finalMarks / submission.assignment.maxMarks) *
        100
      ).toFixed(1)
    : "0";

  const getGradeColor = (pct: number) => {
    if (pct >= 80) return "#10B981";
    if (pct >= 60) return "#F59E0B";
    if (pct >= 40) return "#F97316";
    return "#EF4444";
  };

  const getGradeLabel = (pct: number) => {
    if (pct >= 80) return "Excellent";
    if (pct >= 60) return "Good";
    if (pct >= 40) return "Average";
    return "Needs Improvement";
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <p className="text-white/40 text-sm">Loading feedback...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <div className="text-center space-y-3">
          <span className="text-4xl">🔒</span>
          <p className="text-white/60 text-sm">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white"
            style={{ border: "1px solid rgba(255,255,255,0.15)" }}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!submission) return null;

  const pct = Number(percentage);

  return (
    <div
      className="min-h-screen py-6 px-4"
      style={{ backgroundColor: "#1a1a2e" }}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="rounded-2xl overflow-hidden shadow-2xl">
          <div
            className="px-6 py-4 flex items-center gap-3"
            style={{ backgroundColor: "#8B1A1A" }}
          >
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0">
              <span
                className="text-xs font-semibold"
                style={{ color: "#8B1A1A" }}
              >
                IPS
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-white font-medium text-sm">
                Assignment Feedback Loop
              </h1>
              <p className="text-white/60 text-xs">Your Feedback</p>
            </div>
            <button
              onClick={() => router.push("/student/dashboard")}
              className="text-white/60 text-xs hover:text-white transition-colors"
            >
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Marks Card */}
        <div
          className="rounded-2xl p-6 text-center space-y-2"
          style={{ backgroundColor: "#0f0f23" }}
        >
          <p className="text-white/40 text-xs">
            {submission.assignment.subjectName}
          </p>
          <p className="text-white text-sm font-medium mb-3">
            {submission.assignment.title}
          </p>

          <div
            className="text-6xl font-bold"
            style={{ color: getGradeColor(pct) }}
          >
            {submission.evaluation.finalMarks}
            <span className="text-3xl text-white/30">
              /{submission.assignment.maxMarks}
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 mt-2">
            <div
              className="px-3 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: getGradeColor(pct) }}
            >
              {getGradeLabel(pct)}
            </div>
            <p className="text-white/40 text-xs">{percentage}%</p>
          </div>

          {/* Progress Bar */}
          <div
            className="w-full h-2 rounded-full mt-3 overflow-hidden"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: getGradeColor(pct),
              }}
            />
          </div>

          <p className="text-white/30 text-xs">
            Evaluated by {submission.evaluation.faculty.fullName} ·{" "}
            {new Date(submission.evaluation.publishedAt).toLocaleDateString(
              "en-IN",
              {
                day: "numeric",
                month: "short",
                year: "numeric",
              },
            )}
          </p>
        </div>

        {/* Faculty Remarks */}
        <div
          className="rounded-2xl p-5 space-y-2"
          style={{ backgroundColor: "#0f0f23" }}
        >
          <p className="text-white/40 text-xs">Faculty Remarks</p>
          <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
            {submission.evaluation.facultyRemarks}
          </p>
        </div>

        {/* Annotated Pages */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "#0f0f23" }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-white text-sm font-medium">Your Submission</p>
            <p className="text-white/40 text-xs">
              {submission.evaluation.annotations.length} annotation
              {submission.evaluation.annotations.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="p-4 space-y-3">
            {/* Page Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setCurrentPage((p) => Math.max(0, p - 1));
                  setSelectedAnnotation(null);
                }}
                disabled={currentPage === 0}
                className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-30"
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                ← Prev
              </button>
              <p className="text-white/50 text-xs">
                Page {currentPage + 1} of {submission.pageCount}
              </p>
              <button
                onClick={() => {
                  setCurrentPage((p) =>
                    Math.min(submission.pageCount - 1, p + 1),
                  );
                  setSelectedAnnotation(null);
                }}
                disabled={currentPage === submission.pageCount - 1}
                className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-30"
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                Next →
              </button>
            </div>

            {/* Image with Annotation Dots */}
            <div ref={imageRef} className="relative inline-block w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={submission.fileUrls[currentPage]}
                alt={`Page ${currentPage + 1}`}
                className="w-full rounded-lg shadow-xl"
              />

              {currentPageAnnotations.map((ann, index) => (
                <button
                  key={ann.id}
                  onClick={() =>
                    setSelectedAnnotation(
                      selectedAnnotation?.id === ann.id ? null : ann,
                    )
                  }
                  className="absolute w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg transition-transform hover:scale-110"
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
            </div>

            {/* Selected Annotation */}
            {selectedAnnotation && (
              <div
                className="p-3 rounded-xl"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <p className="text-white/40 text-xs mb-1">
                  {selectedAnnotation.type === "HIGHLIGHT"
                    ? "🟡 Highlight"
                    : "💬 Comment"}
                </p>
                <p className="text-white text-sm">
                  {selectedAnnotation.content}
                </p>
              </div>
            )}

            {currentPageAnnotations.length === 0 && (
              <p className="text-white/20 text-xs text-center py-2">
                No annotations on this page
              </p>
            )}
          </div>
        </div>

        {/* All Annotations List */}
        {submission.evaluation.annotations.length > 0 && (
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ backgroundColor: "#0f0f23" }}
          >
            <p className="text-white/40 text-xs">All Annotations</p>
            {submission.evaluation.annotations.map((ann, index) => (
              <div
                key={ann.id}
                className="flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border:
                    selectedAnnotation?.id === ann.id
                      ? "1px solid rgba(139,26,26,0.5)"
                      : "1px solid rgba(255,255,255,0.08)",
                }}
                onClick={() => {
                  setCurrentPage(ann.pageNumber - 1);
                  setSelectedAnnotation(ann);
                }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor:
                      ann.type === "HIGHLIGHT" ? "#F59E0B" : "#8B1A1A",
                  }}
                >
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/30 text-xs">Page {ann.pageNumber}</p>
                  <p className="text-white/70 text-sm">{ann.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submission Timeline */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ backgroundColor: "#0f0f23" }}
        >
          <p className="text-white/40 text-xs">Timeline</p>
          {[
            {
              label: "Submitted",
              time: submission.submittedAt,
              done: true,
              color: "#3B82F6",
            },
            {
              label: "AI Reviewed",
              time: null,
              done: false,
              color: "#8B5CF6",
            },
            {
              label: "Graded",
              time: submission.evaluation.publishedAt,
              done: true,
              color: "#10B981",
            },
          ].map((step, index) => (
            <div key={index} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0"
                style={{
                  backgroundColor: step.done
                    ? step.color
                    : "rgba(255,255,255,0.1)",
                }}
              >
                {step.done ? "✓" : "○"}
              </div>
              <div className="flex-1">
                <p
                  className="text-xs"
                  style={{
                    color: step.done
                      ? "rgba(255,255,255,0.8)"
                      : "rgba(255,255,255,0.3)",
                  }}
                >
                  {step.label}
                </p>
                {step.time && (
                  <p className="text-white/30 text-xs">
                    {new Date(step.time).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
