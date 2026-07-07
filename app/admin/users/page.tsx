"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

interface UserRow {
  userId: string;
  name: string;
  idNumber: string;
  branch: string;
  role: "STUDENT" | "FACULTY";
  lastLogin: string | null;
  isActive: boolean;
}

type FilterTab = "all" | "students" | "faculty" | "inactive";

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = users;
    if (tab === "students") list = list.filter((u) => u.role === "STUDENT");
    if (tab === "faculty") list = list.filter((u) => u.role === "FACULTY");
    if (tab === "inactive") list = list.filter((u) => !u.isActive);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.idNumber.toLowerCase().includes(q),
      );
    }
    return list;
  }, [users, tab, search]);

  const counts = useMemo(
    () => ({
      all: users.length,
      students: users.filter((u) => u.role === "STUDENT").length,
      faculty: users.filter((u) => u.role === "FACULTY").length,
      inactive: users.filter((u) => !u.isActive).length,
    }),
    [users],
  );

  const handleToggle = async (user: UserRow) => {
    setToggleError(null);
    setTogglingId(user.userId);
    try {
      const res = await fetch(`/api/admin/users/${user.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToggleError(data.error ?? "Failed to update user.");
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === user.userId ? { ...u, isActive: data.isActive } : u,
        ),
      );
    } catch {
      setToggleError("Something went wrong. Please try again.");
    } finally {
      setTogglingId(null);
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
              <h1 className="text-white font-medium text-sm">Manage Users</h1>
              <p className="text-white/60 text-xs">IPS Academy, Indore</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or ID..."
          className="w-full py-2.5 px-4 rounded-xl text-sm text-white placeholder-white/30"
          style={{
            backgroundColor: "#0f0f23",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        />

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

        {/* Filter Tabs + Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "#0f0f23" }}
        >
          <div
            className="flex overflow-x-auto"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            {(
              [
                { key: "all", label: "All" },
                { key: "students", label: "Students" },
                { key: "faculty", label: "Faculty" },
                { key: "inactive", label: "Inactive" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex-shrink-0 px-4 py-3 text-sm font-medium relative whitespace-nowrap"
                style={{
                  color: tab === t.key ? "#fff" : "rgba(255,255,255,0.3)",
                }}
              >
                {t.label}
                <span
                  className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor:
                      tab === t.key ? "#8B1A1A" : "rgba(255,255,255,0.1)",
                    color: "#fff",
                  }}
                >
                  {counts[t.key]}
                </span>
                {tab === t.key && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: "#8B1A1A" }}
                  />
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-white/40 text-sm text-center py-10">
              Loading users...
            </p>
          ) : filtered.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-2">
              <span className="text-4xl">🔍</span>
              <p className="text-white/40 text-sm">No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <th className="text-left py-2.5 px-4 text-white/40 font-medium whitespace-nowrap">
                      Name
                    </th>
                    <th className="text-left py-2.5 px-3 text-white/40 font-medium whitespace-nowrap">
                      ID
                    </th>
                    <th className="text-left py-2.5 px-3 text-white/40 font-medium whitespace-nowrap">
                      Branch
                    </th>
                    <th className="text-left py-2.5 px-3 text-white/40 font-medium whitespace-nowrap">
                      Role
                    </th>
                    <th className="text-left py-2.5 px-3 text-white/40 font-medium whitespace-nowrap">
                      Last Login
                    </th>
                    <th className="text-left py-2.5 px-3 text-white/40 font-medium whitespace-nowrap">
                      Status
                    </th>
                    <th className="text-left py-2.5 px-4 text-white/40 font-medium whitespace-nowrap"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr
                      key={u.userId}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <td className="py-2.5 px-4 text-white/80 whitespace-nowrap">
                        {u.name}
                      </td>
                      <td className="py-2.5 px-3 text-white/50 whitespace-nowrap">
                        {u.idNumber}
                      </td>
                      <td className="py-2.5 px-3 text-white/50 whitespace-nowrap">
                        {u.branch}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{
                            backgroundColor:
                              u.role === "STUDENT"
                                ? "rgba(59,130,246,0.15)"
                                : "rgba(139,26,26,0.2)",
                            color: u.role === "STUDENT" ? "#3B82F6" : "#EF9A9A",
                          }}
                        >
                          {u.role === "STUDENT" ? "Student" : "Faculty"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-white/40 whitespace-nowrap">
                        {u.lastLogin
                          ? new Date(u.lastLogin).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })
                          : "Never"}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{
                            backgroundColor: u.isActive
                              ? "rgba(16,185,129,0.15)"
                              : "rgba(107,114,128,0.2)",
                            color: u.isActive ? "#10B981" : "#9CA3AF",
                          }}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggle(u)}
                          disabled={togglingId === u.userId}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                          style={{
                            backgroundColor: u.isActive
                              ? "rgba(239,68,68,0.15)"
                              : "rgba(16,185,129,0.15)",
                            color: u.isActive ? "#EF4444" : "#10B981",
                          }}
                        >
                          {togglingId === u.userId
                            ? "..."
                            : u.isActive
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
