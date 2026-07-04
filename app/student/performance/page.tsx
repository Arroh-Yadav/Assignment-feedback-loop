"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface HistoryEntry {
  submissionId: string;
  assignmentId: string;
  assignmentTitle: string;
  subject: string;
  marks: number;
  maxMarks: number;
  percentage: number;
  date: string;
  classAveragePercentage: number | null;
}

interface PerformanceData {
  history: HistoryEntry[];
  classAverages: Record<string, number>;
  semesterProgress: { graded: number; totalIssued: number; percent: number };
}

const SUBJECT_COLORS = [
  "#EF4444",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

export default function StudentPerformancePage() {
  const router = useRouter();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/student/performance")
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const subjects = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.history.map((h) => h.subject)));
  }, [data]);

  const subjectColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    subjects.forEach((s, i) => {
      map[s] = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
    });
    return map;
  }, [subjects]);

  const lineChartData = useMemo(() => {
    if (!data) return [];
    return data.history.map((h) => ({
      date: new Date(h.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      [h.subject]: h.percentage,
      classAverage: h.classAveragePercentage ?? undefined,
    }));
  }, [data]);

  const barChartData = useMemo(() => {
    if (!data) return [];
    return data.history.map((h) => ({
      name:
        h.assignmentTitle.length > 12
          ? h.assignmentTitle.slice(0, 12) + "…"
          : h.assignmentTitle,
      score: h.percentage,
    }));
  }, [data]);

  const overallClassAverage = useMemo(() => {
    if (!data || data.history.length === 0) return null;
    const vals = data.history
      .map((h) => h.classAveragePercentage)
      .filter((v): v is number => v !== null);
    if (vals.length === 0) return null;
    return (
      Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
    );
  }, [data]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <p className="text-white/40 text-sm">Loading performance...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <p className="text-white/40 text-sm">
          Couldn&apos;t load performance data.
        </p>
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
            <button
              onClick={() => router.push("/student/dashboard")}
              className="text-white/70 hover:text-white text-sm flex-shrink-0"
            >
              ←
            </button>
            <div className="flex-1">
              <h1 className="text-white font-medium text-sm">My Performance</h1>
              <p className="text-white/60 text-xs">IPS Academy, Indore</p>
            </div>
          </div>
        </div>

        {data.history.length === 0 ? (
          <div
            className="rounded-2xl py-16 flex flex-col items-center gap-2"
            style={{ backgroundColor: "#0f0f23" }}
          >
            <span className="text-4xl">📊</span>
            <p className="text-white/40 text-sm">No graded assignments yet.</p>
            <p className="text-white/25 text-xs">
              Your performance trends will appear here once assignments are
              graded.
            </p>
          </div>
        ) : (
          <>
            {/* Semester Progress */}
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: "#0f0f23" }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-sm font-medium">
                  Semester Progress
                </p>
                <p className="text-white/50 text-xs">
                  {data.semesterProgress.graded} /{" "}
                  {data.semesterProgress.totalIssued} graded
                </p>
              </div>
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${data.semesterProgress.percent}%`,
                    backgroundColor: "#8B1A1A",
                  }}
                />
              </div>
              <p className="text-white/30 text-xs mt-1.5">
                {data.semesterProgress.percent}% of assignments graded
              </p>
            </div>

            {/* Marks Trend Line Chart */}
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: "#0f0f23" }}
            >
              <p className="text-white text-sm font-medium mb-1">
                Marks Trend by Subject
              </p>
              <p className="text-white/30 text-xs mb-4">
                Percentage score per assignment · dotted line = section average
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={lineChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {subjects.map((subject) => (
                    <Line
                      key={subject}
                      type="monotone"
                      dataKey={subject}
                      stroke={subjectColorMap[subject]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="classAverage"
                    name="Section Avg"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Assignment Scores Bar Chart */}
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: "#0f0f23" }}
            >
              <p className="text-white text-sm font-medium mb-1">
                Assignment Scores This Semester
              </p>
              <p className="text-white/30 text-xs mb-4">
                Dotted line = overall section average
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                  />
                  <Bar dataKey="score" fill="#8B1A1A" radius={[4, 4, 0, 0]} />
                  {overallClassAverage !== null && (
                    <ReferenceLine
                      y={overallClassAverage}
                      stroke="rgba(255,255,255,0.5)"
                      strokeDasharray="4 4"
                      label={{
                        value: `Avg ${overallClassAverage}%`,
                        fill: "rgba(255,255,255,0.5)",
                        fontSize: 10,
                        position: "insideTopRight",
                      }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Per-Subject Class Average Summary */}
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: "#0f0f23" }}
            >
              <p className="text-white text-sm font-medium mb-3">
                Subject-wise Section Average
              </p>
              <div className="space-y-2">
                {Object.entries(data.classAverages).map(([subject, avg]) => (
                  <div
                    key={subject}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            subjectColorMap[subject] ?? "#6B7280",
                        }}
                      />
                      <span className="text-white/70 text-xs">{subject}</span>
                    </div>
                    <span className="text-white/50 text-xs font-medium">
                      {avg}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignment History Table */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: "#0f0f23" }}
            >
              <div
                className="px-5 py-3.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <p className="text-white text-sm font-medium">
                  Assignment History
                </p>
              </div>
              <div
                className="divide-y"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                {[...data.history].reverse().map((h) => (
                  <div
                    key={h.submissionId}
                    className="px-5 py-3.5 flex items-center justify-between gap-3"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white/50 text-xs">{h.subject}</p>
                      <p className="text-white text-sm font-medium mt-0.5 truncate">
                        {h.assignmentTitle}
                      </p>
                      <p className="text-white/30 text-xs mt-0.5">
                        {new Date(h.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-bold text-sm">
                        {h.marks} / {h.maxMarks}
                      </p>
                      <button
                        onClick={() =>
                          router.push(`/student/feedback/${h.submissionId}`)
                        }
                        className="text-xs mt-1"
                        style={{ color: "#EF9A9A" }}
                      >
                        View Feedback →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
