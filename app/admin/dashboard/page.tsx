"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";

interface UserRow {
  userId: string;
  role: "STUDENT" | "FACULTY";
  isActive: boolean;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const totalStudents = users.filter((u) => u.role === "STUDENT").length;
  const totalFaculty = users.filter((u) => u.role === "FACULTY").length;
  const totalInactive = users.filter((u) => !u.isActive).length;

  const navCards = [
    {
      title: "Manage Users",
      description: "View, search, and activate/deactivate students & faculty",
      icon: "👥",
      href: "/admin/users",
    },
    {
      title: "Branches & Sections",
      description: "Manage branch/sub-branch/section structure and status",
      icon: "🏛️",
      href: "/admin/branches",
    },
    {
      title: "Institute Sync",
      description: "Sync records against institute data, review mismatches",
      icon: "🔄",
      href: "/admin/sync",
    },
  ];

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
                Admin Dashboard
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

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div
            className="rounded-2xl p-4 text-center"
            style={{ backgroundColor: "#0f0f23" }}
          >
            <p className="text-white text-2xl font-bold">
              {loading ? "—" : totalStudents}
            </p>
            <p className="text-white/40 text-xs mt-1">Students</p>
          </div>
          <div
            className="rounded-2xl p-4 text-center"
            style={{ backgroundColor: "#0f0f23" }}
          >
            <p className="text-white text-2xl font-bold">
              {loading ? "—" : totalFaculty}
            </p>
            <p className="text-white/40 text-xs mt-1">Faculty</p>
          </div>
          <div
            className="rounded-2xl p-4 text-center"
            style={{ backgroundColor: "#0f0f23" }}
          >
            <p
              className="text-2xl font-bold"
              style={{ color: totalInactive > 0 ? "#EF4444" : "#fff" }}
            >
              {loading ? "—" : totalInactive}
            </p>
            <p className="text-white/40 text-xs mt-1">Inactive</p>
          </div>
        </div>

        {/* Nav Cards */}
        <div className="space-y-3">
          {navCards.map((card) => (
            <button
              key={card.href}
              onClick={() => router.push(card.href)}
              className="w-full rounded-2xl p-5 flex items-center gap-4 text-left transition-colors"
              style={{
                backgroundColor: "#0f0f23",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className="text-3xl flex-shrink-0">{card.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{card.title}</p>
                <p className="text-white/40 text-xs mt-0.5">
                  {card.description}
                </p>
              </div>
              <span className="text-white/30 flex-shrink-0">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
