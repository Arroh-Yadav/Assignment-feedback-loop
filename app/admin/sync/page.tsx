"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface MismatchEntry {
  category:
    | "new_student"
    | "new_faculty"
    | "mismatch_student"
    | "mismatch_faculty"
    | "orphaned_student"
    | "orphaned_faculty";
  identifier: string;
  name: string;
  details: string;
}

interface SyncLog {
  id: string;
  runAt: string;
  matchedCount: number;
  newCount: number;
  mismatchCount: number;
  mismatches: MismatchEntry[];
}

const CATEGORY_LABELS: Record<MismatchEntry["category"], string> = {
  new_student: "New Student",
  new_faculty: "New Faculty",
  mismatch_student: "Student Mismatch",
  mismatch_faculty: "Faculty Mismatch",
  orphaned_student: "Orphaned Student",
  orphaned_faculty: "Orphaned Faculty",
};

const CATEGORY_COLORS: Record<MismatchEntry["category"], string> = {
  new_student: "#3B82F6",
  new_faculty: "#3B82F6",
  mismatch_student: "#F59E0B",
  mismatch_faculty: "#F59E0B",
  orphaned_student: "#EF4444",
  orphaned_faculty: "#EF4444",
};

export default function AdminSyncPage() {
  const router = useRouter();
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLastSync = () => {
    return fetch("/api/admin/sync", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setLastSync(d.lastSync ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadLastSync();
  }, []);

  const handleSyncNow = async () => {
    setError(null);
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sync failed.");
        return;
      }
      setLastSync(data.lastSync);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

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
              <h1 className="text-white font-medium text-sm">Institute Sync</h1>
              <p className="text-white/60 text-xs">IPS Academy, Indore</p>
            </div>
          </div>
        </div>

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-xs"
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#EF4444",
            }}
          >
            {error}
          </div>
        )}

        {/* Sync Now Card */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "#0f0f23" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white text-sm font-medium">Last Sync</p>
              <p className="text-white/40 text-xs mt-0.5">
                {loading
                  ? "Loading..."
                  : lastSync
                    ? new Date(lastSync.runAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Never synced"}
              </p>
            </div>
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 flex-shrink-0"
              style={{ backgroundColor: "#8B1A1A" }}
            >
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>

          {lastSync && (
            <div className="grid grid-cols-3 gap-3">
              <div
                className="rounded-xl p-3 text-center"
                style={{ backgroundColor: "rgba(16,185,129,0.1)" }}
              >
                <p className="text-lg font-bold" style={{ color: "#10B981" }}>
                  {lastSync.matchedCount}
                </p>
                <p className="text-white/40 text-xs mt-0.5">Matched</p>
              </div>
              <div
                className="rounded-xl p-3 text-center"
                style={{ backgroundColor: "rgba(59,130,246,0.1)" }}
              >
                <p className="text-lg font-bold" style={{ color: "#3B82F6" }}>
                  {lastSync.newCount}
                </p>
                <p className="text-white/40 text-xs mt-0.5">New</p>
              </div>
              <div
                className="rounded-xl p-3 text-center"
                style={{
                  backgroundColor:
                    lastSync.mismatchCount > 0
                      ? "rgba(239,68,68,0.1)"
                      : "rgba(255,255,255,0.04)",
                }}
              >
                <p
                  className="text-lg font-bold"
                  style={{
                    color: lastSync.mismatchCount > 0 ? "#EF4444" : "#fff",
                  }}
                >
                  {lastSync.mismatchCount}
                </p>
                <p className="text-white/40 text-xs mt-0.5">Flagged</p>
              </div>
            </div>
          )}
        </div>

        {/* Mismatch Review Table */}
        {lastSync && lastSync.mismatches.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "#0f0f23" }}
          >
            <p className="text-white text-sm font-medium p-4 pb-3">
              Records for Review
            </p>
            <div
              className="divide-y"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              {lastSync.mismatches.map((m, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-white/80 text-sm font-medium">
                      {m.name}
                    </p>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs flex-shrink-0"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[m.category]}26`,
                        color: CATEGORY_COLORS[m.category],
                      }}
                    >
                      {CATEGORY_LABELS[m.category]}
                    </span>
                  </div>
                  <p className="text-white/30 text-xs">{m.identifier}</p>
                  <p className="text-white/50 text-xs mt-1">{m.details}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {lastSync && lastSync.mismatches.length === 0 && (
          <div
            className="rounded-2xl py-12 flex flex-col items-center gap-2"
            style={{ backgroundColor: "#0f0f23" }}
          >
            <span className="text-4xl">✅</span>
            <p className="text-white/40 text-sm">
              Everything is in sync — no records flagged.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
