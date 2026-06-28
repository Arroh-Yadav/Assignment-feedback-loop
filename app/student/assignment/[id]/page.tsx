"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

interface Assignment {
  id: string;
  title: string;
  description: string;
  subjectName: string;
  maxMarks: number;
  deadline: string;
  status: string;
  referenceFileUrl: string | null;
  faculty: { fullName: string };
  section: {
    sectionNumber: number;
    year: number;
    subBranch: { name: string };
  };
}

interface Submission {
  id: string;
  status: string;
  submittedAt: string;
  pageCount: number;
}

interface TimelineStep {
  label: string;
  done: boolean;
  time?: string;
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  AI_PROCESSING: "AI Processing",
  AI_DONE: "AI Done",
  UNDER_REVIEW: "Under Review",
  GRADED: "Graded",
};

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "#3B82F6",
  AI_PROCESSING: "#8B5CF6",
  AI_DONE: "#6366F1",
  UNDER_REVIEW: "#F59E0B",
  GRADED: "#10B981",
};

export default function StudentAssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [studentNote, setStudentNote] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/student/assignments/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAssignment(data.assignment ?? null);
        setSubmission(data.submission ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const isDeadlinePassed = assignment
    ? new Date() > new Date(assignment.deadline)
    : false;

  const canSubmit =
    assignment?.status === "ACTIVE" && !isDeadlinePassed && !submission;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    const combined = [...files, ...selected].slice(0, 10);
    setFiles(combined);
    combined.forEach((file, index) => {
      if (previews[index]) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews((prev) => {
          const updated = [...prev];
          updated[index] = ev.target?.result as string;
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError("Please attach at least one page.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("assignmentId", id as string);
      if (studentNote.trim())
        formData.append("studentNote", studentNote.trim());
      files.forEach((file) => formData.append("files", file));
      const res = await fetch("/api/student/submit", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setSubmitting(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <p className="text-white/40 text-sm">Loading assignment...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <p className="text-white/40 text-sm">Assignment not found.</p>
      </div>
    );
  }

  const deadlineDate = new Date(assignment.deadline);

  const timelineSteps: TimelineStep[] = [
    { label: "Submitted", done: true, time: submission?.submittedAt },
    {
      label: "AI Processing",
      done: ["AI_DONE", "UNDER_REVIEW", "GRADED"].includes(
        submission?.status ?? "",
      ),
    },
    {
      label: "Faculty Review",
      done: ["GRADED"].includes(submission?.status ?? ""),
    },
    { label: "Graded", done: submission?.status === "GRADED" },
  ];

  return (
    <div
      className="min-h-screen py-8 px-4"
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
              <p className="text-white/60 text-xs">
                {assignment.section.subBranch.name} · Section{" "}
                {assignment.section.sectionNumber} · Year{" "}
                {assignment.section.year}
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="text-white/60 text-xs hover:text-white transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Assignment Details */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ backgroundColor: "#0f0f23" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-white/40 text-xs mb-1">
                {assignment.subjectName}
              </p>
              <h2 className="text-white text-lg font-semibold">
                {assignment.title}
              </h2>
              <p className="text-white/40 text-xs mt-1">
                by {assignment.faculty.fullName}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-white text-2xl font-bold">
                {assignment.maxMarks}
              </p>
              <p className="text-white/40 text-xs">marks</p>
            </div>
          </div>

          {/* Deadline */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: isDeadlinePassed
                ? "rgba(239,68,68,0.1)"
                : "rgba(255,255,255,0.05)",
              border: isDeadlinePassed
                ? "1px solid rgba(239,68,68,0.3)"
                : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span className="text-sm">🕐</span>
            <p
              className="text-xs"
              style={{
                color: isDeadlinePassed ? "#F87171" : "rgba(255,255,255,0.5)",
              }}
            >
              {isDeadlinePassed ? "Deadline passed — " : "Due: "}
              {deadlineDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Instructions */}
          <div>
            <p className="text-white/40 text-xs mb-2">Instructions</p>
            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
              {assignment.description}
            </p>
          </div>

          {assignment.referenceFileUrl && (
            <a
              href={assignment.referenceFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm w-fit text-red-300"
              style={{
                backgroundColor: "rgba(139,26,26,0.15)",
                border: "1px solid rgba(139,26,26,0.4)",
              }}
            >
              Download Reference File
            </a>
          )}
        </div>

        {/* Submission Status */}
        {submission && (
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: "#0f0f23" }}
          >
            <h3 className="text-white text-sm font-medium">Your Submission</h3>
            <div className="flex items-center gap-3">
              <div
                className="px-3 py-1 rounded-full text-xs font-medium text-white"
                style={{
                  backgroundColor:
                    STATUS_COLORS[submission.status] ?? "#6B7280",
                }}
              >
                {STATUS_LABELS[submission.status] ?? submission.status}
              </div>
              <p className="text-white/30 text-xs">
                {submission.pageCount} page
                {submission.pageCount !== 1 ? "s" : ""} submitted
              </p>
            </div>

            <div className="space-y-2">
              {timelineSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                    style={{
                      backgroundColor: step.done
                        ? "#10B981"
                        : "rgba(255,255,255,0.1)",
                      color: step.done ? "#fff" : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {step.done ? "✓" : "○"}
                  </div>
                  <p
                    className="text-xs"
                    style={{
                      color: step.done
                        ? "rgba(255,255,255,0.8)"
                        : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {step.label}
                    {step.time && (
                      <span className="text-white/30 ml-2">
                        {new Date(step.time).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>

            {submission.status === "GRADED" && (
              <button
                onClick={() =>
                  router.push(`/student/feedback/${submission.id}`)
                }
                className="w-full py-3 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: "#8B1A1A" }}
              >
                View Feedback →
              </button>
            )}
          </div>
        )}

        {/* Upload Section */}
        {canSubmit && (
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: "#0f0f23" }}
          >
            <h3 className="text-white text-sm font-medium">
              Upload Your Submission
            </h3>
            <p className="text-white/30 text-xs">
              Upload pages as images (JPG, PNG) or PDF. Max 10 pages.
            </p>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {previews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative rounded-lg overflow-hidden aspect-[3/4]"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={`Page ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div
                      className="absolute top-0 left-0 px-1.5 py-0.5 text-xs text-white"
                      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                    >
                      {index + 1}
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
                      style={{ backgroundColor: "rgba(239,68,68,0.8)" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {files.length < 10 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg aspect-[3/4] flex items-center justify-center text-2xl"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px dashed rgba(255,255,255,0.2)",
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    +
                  </button>
                )}
              </div>
            )}

            {files.length === 0 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-10 rounded-xl flex flex-col items-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px dashed rgba(255,255,255,0.2)",
                }}
              >
                <span className="text-3xl">📄</span>
                <p className="text-white/40 text-sm">Click to upload pages</p>
                <p className="text-white/20 text-xs">
                  JPG, PNG or PDF · Max 10 pages
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            <div>
              <label className="text-white/40 text-xs block mb-1">
                Note to Faculty{" "}
                <span className="text-white/20">(optional)</span>
              </label>
              <textarea
                placeholder="Any notes or context for the faculty..."
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20 outline-none resize-none"
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            </div>

            {error && (
              <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {!showConfirm ? (
              <button
                onClick={() => {
                  if (files.length === 0) {
                    setError("Please attach at least one page.");
                    return;
                  }
                  setError("");
                  setShowConfirm(true);
                }}
                className="w-full py-3 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: "#8B1A1A" }}
              >
                Submit Assignment →
              </button>
            ) : (
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  backgroundColor: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
              >
                <p className="text-red-300 text-sm font-medium">
                  ⚠️ Are you sure?
                </p>
                <p className="text-red-200/60 text-xs">
                  You cannot edit or re-submit after confirming. Make sure all{" "}
                  {files.length} page{files.length !== 1 ? "s" : ""} are
                  correct.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2.5 rounded-lg text-sm"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.6)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60"
                    style={{ backgroundColor: "#8B1A1A" }}
                  >
                    {submitting ? "Uploading..." : "Confirm Submit"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Locked state */}
        {!canSubmit && !submission && (
          <div
            className="rounded-2xl p-6 flex items-center gap-3"
            style={{ backgroundColor: "#0f0f23" }}
          >
            <span className="text-2xl">🔒</span>
            <div>
              <p className="text-white/60 text-sm">Submissions Closed</p>
              <p className="text-white/30 text-xs">
                {isDeadlinePassed
                  ? "The deadline for this assignment has passed."
                  : "This assignment is not accepting submissions."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
