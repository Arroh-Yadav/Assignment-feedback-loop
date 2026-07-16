"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";

interface Assignment {
  id: string;
  title: string;
  subjectName: string;
  maxMarks: number;
  deadline: string;
  faculty: { fullName: string };
}

interface SubmissionInfo {
  id: string;
  assignmentId: string;
  status: string;
  submittedAt: string;
}

interface StudentInfo {
  fullName: string;
  enrollmentNumber: string;
  year: number;
  semester: number;
  sectionNumber: number;
  subBranchName: string;
  branchName: string;
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

function getTimeLeft(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Deadline passed";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} day${days !== 1 ? "s" : ""} left`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""} left`;
  return "Less than 1 hour left";
}

function getTimeLeftColor(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "#EF4444";
  const hours = diff / (1000 * 60 * 60);
  if (hours <= 24) return "#F59E0B";
  return "#10B981";
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissionMap, setSubmissionMap] = useState<
    Record<string, SubmissionInfo>
  >({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "missed" | "submitted">(
    "active",
  );

  useEffect(() => {
    fetch("/api/student/assignments")
      .then((r) => r.json())
      .then((data) => {
        setStudent(data.student ?? null);
        setAssignments(data.assignments ?? []);
        setSubmissionMap(data.submissionMap ?? {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // Split assignments into active, missed, and submitted
  const activeAssignments = assignments.filter(
    (a) => !submissionMap[a.id] && new Date(a.deadline) > new Date(),
  );
  const missedAssignments = assignments.filter(
    (a) => !submissionMap[a.id] && new Date(a.deadline) <= new Date(),
  );
  const submittedAssignments = assignments.filter((a) => submissionMap[a.id]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <p className="text-white/40 text-sm">Loading dashboard...</p>
      </div>
    );
  }

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
              <p className="text-white/60 text-xs">IPS Academy, Indore</p>
            </div>
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="text-white/60 text-xs hover:text-white transition-colors px-3 py-1.5 rounded-lg"
              style={{ border: "1px solid rgba(255,255,255,0.2)" }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Profile Card */}
        {student && (
          <div
            className="rounded-2xl p-5"
            style={{ backgroundColor: "#0f0f23" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-base">
                  {student.fullName}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {student.enrollmentNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-xs">{student.subBranchName}</p>
                <p className="text-white/40 text-xs mt-0.5">
                  Section {student.sectionNumber} · Year {student.year} · Sem{" "}
                  {student.semester}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "#0f0f23" }}
        >
          {/* Tab Headers */}
          <div
            className="flex"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            {(["active", "missed", "submitted"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-3.5 text-sm font-medium transition-all relative"
                style={{
                  color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.3)",
                  backgroundColor: "transparent",
                }}
              >
                {tab === "active"
                  ? "Active"
                  : tab === "missed"
                    ? "Missed"
                    : "Submitted"}
                {tab === "active" && activeAssignments.length > 0 && (
                  <span
                    className="ml-2 px-1.5 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: "#8B1A1A", color: "#fff" }}
                  >
                    {activeAssignments.length}
                  </span>
                )}
                {tab === "missed" && missedAssignments.length > 0 && (
                  <span
                    className="ml-2 px-1.5 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: "#6B7280", color: "#fff" }}
                  >
                    {missedAssignments.length}
                  </span>
                )}
                {activeTab === tab && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: "#8B1A1A" }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 space-y-3">
            {/* Active Tab */}
            {activeTab === "active" && (
              <>
                {activeAssignments.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-2">
                    <span className="text-4xl">📭</span>
                    <p className="text-white/40 text-sm">
                      No active assignments right now.
                    </p>
                  </div>
                ) : (
                  activeAssignments.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl p-4 space-y-3"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-white/50 text-xs">
                            {a.subjectName}
                          </p>
                          <p className="text-white text-sm font-medium mt-0.5">
                            {a.title}
                          </p>
                          <p className="text-white/30 text-xs mt-0.5">
                            by {a.faculty.fullName}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white font-bold text-lg">
                            {a.maxMarks}
                          </p>
                          <p className="text-white/30 text-xs">marks</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p
                          className="text-xs font-medium"
                          style={{ color: getTimeLeftColor(a.deadline) }}
                        >
                          ⏰ {getTimeLeft(a.deadline)}
                        </p>
                        <p className="text-white/30 text-xs">
                          Due{" "}
                          {new Date(a.deadline).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          router.push(`/student/assignment/${a.id}`)
                        }
                        className="w-full py-2.5 rounded-lg text-white text-sm font-medium"
                        style={{ backgroundColor: "#8B1A1A" }}
                      >
                        Submit Now →
                      </button>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Missed Tab */}
            {activeTab === "missed" && (
              <>
                {missedAssignments.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-2">
                    <span className="text-4xl">✅</span>
                    <p className="text-white/40 text-sm">
                      No missed assignments.
                    </p>
                  </div>
                ) : (
                  missedAssignments.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl p-4 space-y-3"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        opacity: 0.75,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-white/50 text-xs">
                            {a.subjectName}
                          </p>
                          <p className="text-white text-sm font-medium mt-0.5">
                            {a.title}
                          </p>
                          <p className="text-white/30 text-xs mt-0.5">
                            by {a.faculty.fullName}
                          </p>
                        </div>
                        <div
                          className="px-2.5 py-1 rounded-full text-xs font-medium text-white flex-shrink-0"
                          style={{ backgroundColor: "#6B7280" }}
                        >
                          Closed
                        </div>
                      </div>

                      <p className="text-xs" style={{ color: "#9CA3AF" }}>
                        ⏰ Deadline passed —{" "}
                        {new Date(a.deadline).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>

                      <button
                        onClick={() =>
                          router.push(`/student/assignment/${a.id}`)
                        }
                        className="w-full py-2.5 rounded-lg text-sm"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.05)",
                          color: "rgba(255,255,255,0.5)",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        View Details →
                      </button>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Submitted Tab */}
            {activeTab === "submitted" && (
              <>
                {submittedAssignments.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-2">
                    <span className="text-4xl">📝</span>
                    <p className="text-white/40 text-sm">No submissions yet.</p>
                  </div>
                ) : (
                  submittedAssignments.map((a) => {
                    const sub = submissionMap[a.id];
                    return (
                      <div
                        key={a.id}
                        className="rounded-xl p-4 space-y-3"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-white/50 text-xs">
                              {a.subjectName}
                            </p>
                            <p className="text-white text-sm font-medium mt-0.5">
                              {a.title}
                            </p>
                            <p className="text-white/30 text-xs mt-0.5">
                              Submitted{" "}
                              {new Date(sub.submittedAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          </div>
                          <div
                            className="px-2.5 py-1 rounded-full text-xs font-medium text-white flex-shrink-0"
                            style={{
                              backgroundColor:
                                STATUS_COLORS[sub.status] ?? "#6B7280",
                            }}
                          >
                            {STATUS_LABELS[sub.status] ?? sub.status}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              router.push(`/student/assignment/${a.id}`)
                            }
                            className="flex-1 py-2 rounded-lg text-sm"
                            style={{
                              backgroundColor: "rgba(255,255,255,0.07)",
                              color: "rgba(255,255,255,0.6)",
                              border: "1px solid rgba(255,255,255,0.15)",
                            }}
                          >
                            View →
                          </button>
                          {sub.status === "GRADED" && (
                            <button
                              onClick={() =>
                                router.push(`/student/feedback/${sub.id}`)
                              }
                              className="flex-1 py-2 rounded-lg text-white text-sm font-medium"
                              style={{ backgroundColor: "#8B1A1A" }}
                            >
                              View Feedback →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>

        {/* Performance Link */}
        <button
          onClick={() => router.push("/student/performance")}
          className="w-full py-3 rounded-2xl text-sm flex items-center justify-center gap-2"
          style={{
            backgroundColor: "#0f0f23",
            color: "rgba(255,255,255,0.4)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          📊 View My Performance
        </button>
      </div>
    </div>
  );
}
