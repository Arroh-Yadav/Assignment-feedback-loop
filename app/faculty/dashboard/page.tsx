"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface FacultySection {
  id: string;
  sectionId: string;
  subjectName: string;
  subjectCode: string;
  section: {
    sectionNumber: number;
    year: number;
    subBranch: { name: string };
  };
}

interface Assignment {
  id: string;
  title: string;
  subjectName: string;
  maxMarks: number;
  deadline: string;
  status: string;
  _count: { submissions: number };
}

interface FacultyInfo {
  fullName: string;
  employeeId: string;
  instituteEmail: string;
  branch: { name: string };
}

interface PerAssignmentStat {
  assignmentId: string;
  title: string;
  maxMarks: number;
  createdAt: string;
  avgMarks: number | null;
  avgPercentage: number | null;
  gradedCount: number;
  totalSubmissions: number;
}

interface TopError {
  message: string;
  count: number;
}

interface StudentMarksRow {
  studentId: string;
  fullName: string;
  enrollmentNumber: string;
  marks: Record<string, number | null>;
}

interface AnalyticsData {
  section: { id: string; label: string };
  assignments: { id: string; title: string; maxMarks: number }[];
  perAssignment: PerAssignmentStat[];
  topErrors: TopError[];
  studentMarks: StudentMarksRow[];
}

export default function FacultyDashboardPage() {
  const router = useRouter();
  const [faculty, setFaculty] = useState<FacultyInfo | null>(null);
  const [facultySections, setFacultySections] = useState<FacultySection[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "draft" | "analytics">(
    "active",
  );

  // Analytics tab state
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(false);

  useEffect(() => {
    fetch("/api/faculty/dashboard")
      .then((r) => r.json())
      .then((data) => {
        setFaculty(data.faculty ?? null);
        setFacultySections(data.facultySections ?? []);
        setAssignments(data.assignments ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Unique sections this faculty teaches (a faculty can have multiple
  // FacultySection rows for the same section across different subjects)
  const uniqueSections = useMemo(() => {
    const seen = new Set<string>();
    const result: { sectionId: string; label: string }[] = [];
    for (const fs of facultySections) {
      if (seen.has(fs.sectionId)) continue;
      seen.add(fs.sectionId);
      result.push({
        sectionId: fs.sectionId,
        label: `${fs.section.subBranch.name} · Sec ${fs.section.sectionNumber}`,
      });
    }
    return result;
  }, [facultySections]);

  // Auto-select the first section once loaded
  useEffect(() => {
    if (!selectedSectionId && uniqueSections.length > 0) {
      setSelectedSectionId(uniqueSections[0].sectionId);
    }
  }, [uniqueSections, selectedSectionId]);

  // Fetch analytics whenever the Analytics tab is active and a section is selected
  useEffect(() => {
    if (activeTab !== "analytics" || !selectedSectionId) return;
    setAnalyticsLoading(true);
    setAnalyticsError(false);
    fetch(`/api/faculty/analytics?sectionId=${selectedSectionId}`)
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((d) => {
        setAnalytics(d);
        setAnalyticsLoading(false);
      })
      .catch(() => {
        setAnalyticsError(true);
        setAnalyticsLoading(false);
      });
  }, [activeTab, selectedSectionId]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const activeAssignments = assignments.filter((a) => a.status === "ACTIVE");
  const draftAssignments = assignments.filter((a) => a.status === "DRAFT");

  const barChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.perAssignment.map((p) => ({
      name: p.title.length > 12 ? p.title.slice(0, 12) + "…" : p.title,
      avgMarks: p.avgMarks ?? 0,
    }));
  }, [analytics]);

  const trendChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.perAssignment
      .filter((p) => p.avgPercentage !== null)
      .map((p) => ({
        name: p.title.length > 12 ? p.title.slice(0, 12) + "…" : p.title,
        avgPercentage: p.avgPercentage,
      }));
  }, [analytics]);

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
            <button
              onClick={handleLogout}
              className="text-white/60 text-xs hover:text-white transition-colors px-3 py-1.5 rounded-lg"
              style={{ border: "1px solid rgba(255,255,255,0.2)" }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Faculty Profile Card */}
        {faculty && (
          <div
            className="rounded-2xl p-5"
            style={{ backgroundColor: "#0f0f23" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-base">
                  {faculty.fullName}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {faculty.instituteEmail}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-xs">{faculty.branch.name}</p>
                <p className="text-white/40 text-xs mt-0.5">
                  ID: {faculty.employeeId}
                </p>
              </div>
            </div>

            {/* Sections */}
            <div className="mt-3 flex flex-wrap gap-2">
              {facultySections.map((fs) => (
                <div
                  key={fs.id}
                  className="px-2.5 py-1 rounded-lg text-xs"
                  style={{
                    backgroundColor: "rgba(139,26,26,0.15)",
                    border: "1px solid rgba(139,26,26,0.3)",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  {fs.section.subBranch.name} · Sec {fs.section.sectionNumber} ·{" "}
                  {fs.subjectName}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Assignment Button */}
        <button
          onClick={() => router.push("/faculty/assignments/create")}
          className="w-full py-3.5 rounded-2xl text-white text-sm font-medium flex items-center justify-center gap-2"
          style={{ backgroundColor: "#8B1A1A" }}
        >
          + Create New Assignment
        </button>

        {/* Assignments / Analytics Tabs */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "#0f0f23" }}
        >
          <div
            className="flex"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            {(["active", "draft", "analytics"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-3.5 text-sm font-medium transition-all relative"
                style={{
                  color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.3)",
                }}
              >
                {tab === "active"
                  ? "Active"
                  : tab === "draft"
                    ? "Drafts"
                    : "Analytics"}
                {tab !== "analytics" &&
                  (tab === "active" ? activeAssignments : draftAssignments)
                    .length > 0 && (
                    <span
                      className="ml-2 px-1.5 py-0.5 rounded-full text-xs"
                      style={{
                        backgroundColor:
                          activeTab === tab
                            ? "#8B1A1A"
                            : "rgba(255,255,255,0.1)",
                        color: "#fff",
                      }}
                    >
                      {
                        (tab === "active"
                          ? activeAssignments
                          : draftAssignments
                        ).length
                      }
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

          {/* Active / Draft Tab Content */}
          {activeTab !== "analytics" && (
            <div className="p-4 space-y-3">
              {(activeTab === "active" ? activeAssignments : draftAssignments)
                .length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-2">
                  <span className="text-4xl">
                    {activeTab === "active" ? "📭" : "📝"}
                  </span>
                  <p className="text-white/40 text-sm">
                    {activeTab === "active"
                      ? "No active assignments."
                      : "No drafts."}
                  </p>
                </div>
              ) : (
                (activeTab === "active"
                  ? activeAssignments
                  : draftAssignments
                ).map((a) => (
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
                        <p className="text-white/50 text-xs">{a.subjectName}</p>
                        <p className="text-white text-sm font-medium mt-0.5">
                          {a.title}
                        </p>
                        <p className="text-white/30 text-xs mt-1">
                          Due{" "}
                          {new Date(a.deadline).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
                      <p className="text-white/30 text-xs">
                        {a._count.submissions} submission
                        {a._count.submissions !== 1 ? "s" : ""}
                      </p>
                      <button
                        onClick={() =>
                          router.push(`/faculty/assignments/${a.id}`)
                        }
                        className="px-4 py-2 rounded-lg text-white text-xs font-medium"
                        style={{ backgroundColor: "#8B1A1A" }}
                      >
                        View Submissions →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Analytics Tab Content */}
          {activeTab === "analytics" && (
            <div className="p-4 space-y-4">
              {uniqueSections.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-2">
                  <span className="text-4xl">📊</span>
                  <p className="text-white/40 text-sm">
                    No sections assigned yet.
                  </p>
                </div>
              ) : (
                <>
                  {/* Section Selector */}
                  {uniqueSections.length > 1 && (
                    <select
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-lg text-sm"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#fff",
                      }}
                    >
                      {uniqueSections.map((s) => (
                        <option
                          key={s.sectionId}
                          value={s.sectionId}
                          style={{ backgroundColor: "#1a1a2e" }}
                        >
                          {s.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {analyticsLoading && (
                    <p className="text-white/40 text-sm text-center py-8">
                      Loading analytics...
                    </p>
                  )}

                  {analyticsError && (
                    <p className="text-white/40 text-sm text-center py-8">
                      Couldn&apos;t load analytics for this section.
                    </p>
                  )}

                  {!analyticsLoading && !analyticsError && analytics && (
                    <>
                      {analytics.perAssignment.length === 0 ? (
                        <div className="py-12 flex flex-col items-center gap-2">
                          <span className="text-4xl">📭</span>
                          <p className="text-white/40 text-sm">
                            No assignments in this section yet.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Avg Marks Bar Chart */}
                          <div
                            className="rounded-xl p-4"
                            style={{
                              backgroundColor: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <p className="text-white text-sm font-medium mb-3">
                              Average Marks per Assignment
                            </p>
                            <ResponsiveContainer width="100%" height={220}>
                              <BarChart data={barChartData}>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="rgba(255,255,255,0.06)"
                                />
                                <XAxis
                                  dataKey="name"
                                  tick={{
                                    fill: "rgba(255,255,255,0.4)",
                                    fontSize: 10,
                                  }}
                                  axisLine={{
                                    stroke: "rgba(255,255,255,0.15)",
                                  }}
                                />
                                <YAxis
                                  tick={{
                                    fill: "rgba(255,255,255,0.4)",
                                    fontSize: 11,
                                  }}
                                  axisLine={{
                                    stroke: "rgba(255,255,255,0.15)",
                                  }}
                                  width={32}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "#1a1a2e",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                    fontSize: 12,
                                  }}
                                  labelStyle={{
                                    color: "rgba(255,255,255,0.6)",
                                  }}
                                />
                                <Bar
                                  dataKey="avgMarks"
                                  fill="#8B1A1A"
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Section Average Trend */}
                          <div
                            className="rounded-xl p-4"
                            style={{
                              backgroundColor: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <p className="text-white text-sm font-medium mb-3">
                              Section Average Trend
                            </p>
                            <ResponsiveContainer width="100%" height={220}>
                              <LineChart data={trendChartData}>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="rgba(255,255,255,0.06)"
                                />
                                <XAxis
                                  dataKey="name"
                                  tick={{
                                    fill: "rgba(255,255,255,0.4)",
                                    fontSize: 10,
                                  }}
                                  axisLine={{
                                    stroke: "rgba(255,255,255,0.15)",
                                  }}
                                />
                                <YAxis
                                  domain={[0, 100]}
                                  tick={{
                                    fill: "rgba(255,255,255,0.4)",
                                    fontSize: 11,
                                  }}
                                  axisLine={{
                                    stroke: "rgba(255,255,255,0.15)",
                                  }}
                                  width={32}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "#1a1a2e",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8,
                                    fontSize: 12,
                                  }}
                                  labelStyle={{
                                    color: "rgba(255,255,255,0.6)",
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="avgPercentage"
                                  stroke="#10B981"
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Top 5 Common Errors */}
                          <div
                            className="rounded-xl p-4"
                            style={{
                              backgroundColor: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <p className="text-white text-sm font-medium mb-3">
                              Top 5 Common Errors
                            </p>
                            {analytics.topErrors.length === 0 ? (
                              <p className="text-white/30 text-xs">
                                No AI-flagged errors yet for this section.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {analytics.topErrors.map((err, i) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-2.5"
                                  >
                                    <span
                                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium"
                                      style={{
                                        backgroundColor: "rgba(239,68,68,0.15)",
                                        color: "#EF4444",
                                      }}
                                    >
                                      {err.count}
                                    </span>
                                    <p className="text-white/70 text-xs leading-relaxed">
                                      {err.message}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Student-wise Marks Table */}
                          <div
                            className="rounded-xl overflow-hidden"
                            style={{
                              backgroundColor: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <p className="text-white text-sm font-medium p-4 pb-3">
                              Student-wise Marks
                            </p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr
                                    style={{
                                      borderTop:
                                        "1px solid rgba(255,255,255,0.08)",
                                      borderBottom:
                                        "1px solid rgba(255,255,255,0.08)",
                                    }}
                                  >
                                    <th className="text-left py-2 px-4 text-white/40 font-medium whitespace-nowrap">
                                      Student
                                    </th>
                                    {analytics.assignments.map((a) => (
                                      <th
                                        key={a.id}
                                        className="text-center py-2 px-3 text-white/40 font-medium whitespace-nowrap"
                                      >
                                        {a.title.length > 10
                                          ? a.title.slice(0, 10) + "…"
                                          : a.title}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {analytics.studentMarks.map((row) => (
                                    <tr
                                      key={row.studentId}
                                      style={{
                                        borderBottom:
                                          "1px solid rgba(255,255,255,0.04)",
                                      }}
                                    >
                                      <td className="py-2 px-4 text-white/70 whitespace-nowrap">
                                        {row.fullName}
                                        <span className="text-white/30 block">
                                          {row.enrollmentNumber}
                                        </span>
                                      </td>
                                      {analytics.assignments.map((a) => (
                                        <td
                                          key={a.id}
                                          className="text-center py-2 px-3 text-white/60"
                                        >
                                          {row.marks[a.id] !== undefined &&
                                          row.marks[a.id] !== null
                                            ? `${row.marks[a.id]}/${a.maxMarks}`
                                            : "—"}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
