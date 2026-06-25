"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "student" | "faculty" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Student fields
  const [computerCode, setComputerCode] = useState("");
  const [enrollmentNumber, setEnrollmentNumber] = useState("");

  // Faculty fields
  const [employeeId, setEmployeeId] = useState("");
  const [instituteEmail, setInstituteEmail] = useState("");

  // Admin fields
  const [adminId, setAdminId] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    let credentials = {};
    if (role === "student") {
      if (!computerCode || !enrollmentNumber) {
        setError("Please fill in all fields.");
        setLoading(false);
        return;
      }
      credentials = { computerCode, enrollmentNumber };
    } else if (role === "faculty") {
      if (!employeeId || !instituteEmail) {
        setError("Please fill in all fields.");
        setLoading(false);
        return;
      }
      credentials = { employeeId, instituteEmail };
    } else {
      if (!adminId || !adminEmail) {
        setError("Please fill in all fields.");
        setLoading(false);
        return;
      }
      credentials = { employeeId: adminId, instituteEmail: adminEmail };
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, credentials }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Access denied. Contact Admin.");
        setLoading(false);
        return;
      }

      // Redirect based on role and profile completion
      if (!data.profileComplete) {
        router.push(`/${role}/setup`);
      } else {
        router.push(`/${role}/dashboard`);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#1a1a2e" }}
    >
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ backgroundColor: "#8B1A1A" }}
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
            <span
              className="text-xs font-semibold"
              style={{ color: "#8B1A1A" }}
            >
              IPS
            </span>
          </div>
          <div>
            <h1 className="text-white font-medium text-base">
              Assignment Feedback Loop
            </h1>
            <p className="text-white/60 text-xs">IPS Academy, Indore — IES</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-8" style={{ backgroundColor: "#0f0f23" }}>
          <h2 className="text-white text-lg font-medium mb-1">Welcome back</h2>
          <p className="text-white/50 text-sm mb-6">
            Sign in with your institute credentials
          </p>

          {/* Role Tabs */}
          <p className="text-white/40 text-xs mb-2">Sign in as</p>
          <div className="flex gap-2 mb-6">
            {(["student", "faculty", "admin"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRole(r);
                  setError("");
                }}
                className="flex-1 py-2 rounded-lg text-sm capitalize transition-all"
                style={{
                  backgroundColor: role === r ? "#8B1A1A" : "transparent",
                  color: role === r ? "#fff" : "rgba(255,255,255,0.4)",
                  border:
                    role === r
                      ? "1px solid #8B1A1A"
                      : "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Student Fields */}
          {role === "student" && (
            <div className="space-y-4">
              <div>
                <label className="text-white/50 text-xs block mb-1">
                  Computer Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0901CS211001"
                  value={computerCode}
                  onChange={(e) => setComputerCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-white/25 outline-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                />
              </div>
              <div>
                <label className="text-white/50 text-xs block mb-1">
                  Enrollment Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. EN2021001"
                  value={enrollmentNumber}
                  onChange={(e) => setEnrollmentNumber(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-white/25 outline-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Faculty Fields */}
          {role === "faculty" && (
            <div className="space-y-4">
              <div>
                <label className="text-white/50 text-xs block mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. FAC001"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-white/25 outline-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                />
              </div>
              <div>
                <label className="text-white/50 text-xs block mb-1">
                  Institute Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. name@ipsacademy.org"
                  value={instituteEmail}
                  onChange={(e) => setInstituteEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-white/25 outline-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Admin Fields */}
          {role === "admin" && (
            <div className="space-y-4">
              <div>
                <label className="text-white/50 text-xs block mb-1">
                  Admin ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. ADMIN001"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-white/25 outline-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                />
              </div>
              <div>
                <label className="text-white/50 text-xs block mb-1">
                  Institute Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. admin@ipsacademy.org"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-white/25 outline-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Sign In Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full mt-6 py-3 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "#8B1A1A" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {/* Lock Note */}
          <p className="text-white/30 text-xs text-center mt-4">
            🔒 Access restricted to IPS Academy registered individuals only
          </p>
        </div>
      </div>
    </div>
  );
}
