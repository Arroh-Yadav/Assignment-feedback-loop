"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

export default function FacultyDashboardPage() {
  const router = useRouter();
  const [faculty, setFaculty] = useState<FacultyInfo | null>(null);
  const [facultySections, setFacultySections] = useState<FacultySection[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "draft">("active");

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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const activeAssignments = assignments.filter((a) => a.status === "ACTIVE");
  const draftAssignments = assignments.filter((a) => a.status === "DRAFT");

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

        {/* Assignments Tabs */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "#0f0f23" }}
        >
          <div
            className="flex"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            {(["active", "draft"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-3.5 text-sm font-medium transition-all relative"
                style={{
                  color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.3)",
                }}
              >
                {tab === "active" ? "Active" : "Drafts"}
                {(tab === "active" ? activeAssignments : draftAssignments)
                  .length > 0 && (
                  <span
                    className="ml-2 px-1.5 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor:
                        activeTab === tab ? "#8B1A1A" : "rgba(255,255,255,0.1)",
                      color: "#fff",
                    }}
                  >
                    {
                      (tab === "active" ? activeAssignments : draftAssignments)
                        .length
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
        </div>
      </div>
    </div>
  );
}
