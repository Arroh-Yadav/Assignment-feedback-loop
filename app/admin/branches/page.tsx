"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SectionNode {
  id: string;
  sectionNumber: number;
  year: number;
  isActive: boolean;
  studentCount: number;
  facultyCount: number;
}

interface SubBranchNode {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  studentCount: number;
  facultyCount: number;
  sections: SectionNode[];
}

interface BranchNode {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  studentCount: number;
  facultyCount: number;
  subBranches: SubBranchNode[];
}

export default function AdminBranchesPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<BranchNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(
    new Set(),
  );
  const [expandedSubBranches, setExpandedSubBranches] = useState<Set<string>>(
    new Set(),
  );
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const loadBranches = () => {
    return fetch("/api/admin/branches", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setBranches(d.branches ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const toggleExpand = (
    id: string,
    set: Set<string>,
    setter: (s: Set<string>) => void,
  ) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const handleToggleActive = async (
    type: "branch" | "subbranch" | "section",
    id: string,
    currentIsActive: boolean,
  ) => {
    setToggleError(null);
    setTogglingId(id);
    try {
      const res = await fetch(`/api/admin/branches/${type}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentIsActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToggleError(data.error ?? "Failed to update.");
        return;
      }

      // Refetch the full tree so counts and status always reflect the DB
      // exactly — no manual state surgery, no risk of drifting out of sync.
      await loadBranches();
    } catch {
      setToggleError("Something went wrong. Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  const StatusToggle = ({
    isActive,
    onToggle,
    disabled,
  }: {
    isActive: boolean;
    onToggle: () => void;
    disabled: boolean;
  }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      disabled={disabled}
      className="px-2.5 py-1 rounded-lg text-xs font-medium disabled:opacity-50 flex-shrink-0"
      style={{
        backgroundColor: isActive
          ? "rgba(16,185,129,0.15)"
          : "rgba(107,114,128,0.2)",
        color: isActive ? "#10B981" : "#9CA3AF",
      }}
    >
      {disabled ? "..." : isActive ? "Active" : "Inactive"}
    </button>
  );

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
              onClick={() => router.push("/admin/dashboard")}
              className="text-white/70 hover:text-white text-sm flex-shrink-0"
            >
              ←
            </button>
            <div className="flex-1">
              <h1 className="text-white font-medium text-sm">
                Branches & Sections
              </h1>
              <p className="text-white/60 text-xs">IPS Academy, Indore</p>
            </div>
          </div>
        </div>

        {toggleError && (
          <div
            className="rounded-xl px-4 py-3 text-xs"
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#EF4444",
            }}
          >
            {toggleError}
          </div>
        )}

        {/* Tree */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "#0f0f23" }}
        >
          {loading ? (
            <p className="text-white/40 text-sm text-center py-10">
              Loading branches...
            </p>
          ) : branches.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-2">
              <span className="text-4xl">🏛️</span>
              <p className="text-white/40 text-sm">No branches found.</p>
            </div>
          ) : (
            <div
              className="divide-y"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              {branches.map((branch) => {
                const isExpanded = expandedBranches.has(branch.id);
                return (
                  <div key={branch.id}>
                    {/* Branch Row */}
                    <div
                      onClick={() =>
                        toggleExpand(
                          branch.id,
                          expandedBranches,
                          setExpandedBranches,
                        )
                      }
                      className="px-4 py-3.5 flex items-center gap-3 cursor-pointer"
                      style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                    >
                      <span className="text-white/40 text-xs w-4 flex-shrink-0">
                        {isExpanded ? "▾" : "▸"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">
                          {branch.name}
                        </p>
                        <p className="text-white/30 text-xs mt-0.5">
                          {branch.code} · {branch.studentCount} students ·{" "}
                          {branch.facultyCount} faculty
                        </p>
                      </div>
                      <StatusToggle
                        isActive={branch.isActive}
                        disabled={togglingId === branch.id}
                        onToggle={() =>
                          handleToggleActive(
                            "branch",
                            branch.id,
                            branch.isActive,
                          )
                        }
                      />
                    </div>

                    {/* Sub-Branches */}
                    {isExpanded &&
                      branch.subBranches.map((sb) => {
                        const isSbExpanded = expandedSubBranches.has(sb.id);
                        return (
                          <div key={sb.id}>
                            <div
                              onClick={() =>
                                toggleExpand(
                                  sb.id,
                                  expandedSubBranches,
                                  setExpandedSubBranches,
                                )
                              }
                              className="px-4 py-3 pl-9 flex items-center gap-3 cursor-pointer"
                              style={{
                                borderTop: "1px solid rgba(255,255,255,0.04)",
                              }}
                            >
                              <span className="text-white/30 text-xs w-4 flex-shrink-0">
                                {isSbExpanded ? "▾" : "▸"}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-white/80 text-sm">
                                  {sb.name}
                                </p>
                                <p className="text-white/25 text-xs mt-0.5">
                                  {sb.code} · {sb.studentCount} students ·{" "}
                                  {sb.facultyCount} faculty
                                </p>
                              </div>
                              <StatusToggle
                                isActive={sb.isActive}
                                disabled={togglingId === sb.id}
                                onToggle={() =>
                                  handleToggleActive(
                                    "subbranch",
                                    sb.id,
                                    sb.isActive,
                                  )
                                }
                              />
                            </div>

                            {/* Sections */}
                            {isSbExpanded &&
                              sb.sections.map((sec) => (
                                <div
                                  key={sec.id}
                                  className="px-4 py-2.5 pl-16 flex items-center gap-3"
                                  style={{
                                    borderTop:
                                      "1px solid rgba(255,255,255,0.03)",
                                  }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white/60 text-xs">
                                      Section {sec.sectionNumber} · Year{" "}
                                      {sec.year}
                                    </p>
                                    <p className="text-white/25 text-xs mt-0.5">
                                      {sec.studentCount} students ·{" "}
                                      {sec.facultyCount} faculty
                                    </p>
                                  </div>
                                  <StatusToggle
                                    isActive={sec.isActive}
                                    disabled={togglingId === sec.id}
                                    onToggle={() =>
                                      handleToggleActive(
                                        "section",
                                        sec.id,
                                        sec.isActive,
                                      )
                                    }
                                  />
                                </div>
                              ))}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
