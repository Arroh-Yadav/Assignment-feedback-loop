"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Assignment {
  id: string;
  title: string;
  subjectName: string;
  maxMarks: number;
  deadline: string;
  status: string;
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
  studentNote: string | null;
  student: {
    fullName: string;
    enrollmentNumber: string;
  };
}

type FilterTab = "all" | "pending" | "ai_done" | "graded";

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

export default function FacultyAssignmentSubmissionsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    fetch(`/api/faculty/submissions?assignmentId=${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAssignment(data.assignment ?? null);
        setSubmissions(data.submissions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const filteredSubmissions = submissions.filter((s) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending")
      return ["SUBMITTED", "AI_PROCESSING"].includes(s.status);
    if (activeTab === "ai_done") return s.status === "AI_DONE";
    if (activeTab === "graded") return s.status === "GRADED";
    return true;
  });

  const tabCounts = {
    all: submissions.length,
    pending: submissions.filter((s) =>
      ["SUBMITTED", "AI_PROCESSING"].includes(s.status),
    ).length,
    ai_done: submissions.filter((s) => s.status === "AI_DONE").length,
    graded: submissions.filter((s) => s.status === "GRADED").length,
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <p className="text-white/40 text-sm">Loading submissions...</p>
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

  const isDeadlinePassed = new Date() > new Date(assignment.deadline);

  return (
    <div
      className="min-h-screen py-6 px-4"
      style={{ backgroundColor: "#1a1a2e" }}
    >
      <div className="max-w-3xl mx-auto space-y-4">
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

        {/* Assignment Info Card */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ backgroundColor: "#0f0f23" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-white/40 text-xs">{assignment.subjectName}</p>
              <h2 className="text-white text-base font-semibold mt-0.5">
                {assignment.title}
              </h2>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-white text-2xl font-bold">
                {assignment.maxMarks}
              </p>
              <p className="text-white/40 text-xs">max marks</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: isDeadlinePassed
                  ? "rgba(239,68,68,0.15)"
                  : "rgba(16,185,129,0.15)",
                color: isDeadlinePassed ? "#F87171" : "#10B981",
              }}
            >
              {isDeadlinePassed ? "Deadline Passed" : "Active"}
            </div>
            <p className="text-white/30 text-xs">
              Due{" "}
              {new Date(assignment.deadline).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-white/30 text-xs ml-auto">
              {submissions.length} submission
              {submissions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Filter Tabs + Submissions */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "#0f0f23" }}
        >
          {/* Tabs */}
          <div
            className="flex"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            {(["all", "pending", "ai_done", "graded"] as FilterTab[]).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-3 text-xs font-medium transition-all relative"
                  style={{
                    color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.3)",
                  }}
                >
                  {tab === "all" && "All"}
                  {tab === "pending" && "Pending"}
                  {tab === "ai_done" && "AI Done"}
                  {tab === "graded" && "Graded"}
                  {tabCounts[tab] > 0 && (
                    <span
                      className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                      style={{
                        backgroundColor:
                          activeTab === tab
                            ? "#8B1A1A"
                            : "rgba(255,255,255,0.1)",
                        color: "#fff",
                      }}
                    >
                      {tabCounts[tab]}
                    </span>
                  )}
                  {activeTab === tab && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ backgroundColor: "#8B1A1A" }}
                    />
                  )}
                </button>
              ),
            )}
          </div>

          {/* Submissions List */}
          <div className="p-4 space-y-3">
            {filteredSubmissions.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-2">
                <span className="text-4xl">📭</span>
                <p className="text-white/40 text-sm">
                  No submissions in this category.
                </p>
              </div>
            ) : (
              filteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-xl p-4 space-y-3"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">
                        {sub.student.fullName}
                      </p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {sub.student.enrollmentNumber}
                      </p>
                      <p className="text-white/30 text-xs mt-1">
                        Submitted{" "}
                        {new Date(sub.submittedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {sub.pageCount} page{sub.pageCount !== 1 ? "s" : ""}
                      </p>
                      {sub.studentNote && (
                        <p className="text-white/40 text-xs mt-1 italic">
                          Note: {sub.studentNote}
                        </p>
                      )}
                    </div>
                    <div
                      className="px-2.5 py-1 rounded-full text-xs font-medium text-white flex-shrink-0"
                      style={{
                        backgroundColor: STATUS_COLORS[sub.status] ?? "#6B7280",
                      }}
                    >
                      {STATUS_LABELS[sub.status] ?? sub.status}
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/faculty/evaluate/${sub.id}`)}
                    className="w-full py-2.5 rounded-lg text-white text-sm font-medium"
                    style={{ backgroundColor: "#8B1A1A" }}
                  >
                    {sub.status === "GRADED"
                      ? "View Evaluation →"
                      : "Evaluate →"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
