"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BRANCHES, YEARS, SEMESTERS_BY_YEAR, SECTIONS } from "@/lib/setupData";

type Step = 1 | 2 | 3;

export default function StudentSetupPage() {
  const router = useRouter();

  const [branchCode, setBranchCode] = useState("");
  const [subBranchCode, setSubBranchCode] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [semester, setSemester] = useState<number | "">("");
  const [sectionNumber, setSectionNumber] = useState<number | "">("");

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedBranch = BRANCHES.find((b) => b.code === branchCode);
  const selectedSubBranch = selectedBranch?.subBranches.find(
    (s) => s.code === subBranchCode,
  );
  const availableSemesters = year ? SEMESTERS_BY_YEAR[year] : [];

  const handleStep1Next = () => {
    if (!branchCode || !subBranchCode) {
      setError("Please select both Branch and Sub-Branch.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleStep2Next = () => {
    if (!year || !semester || !sectionNumber) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setStep(3);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/student/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchCode,
          branchName: selectedBranch?.name,
          subBranchCode,
          subBranchName: selectedSubBranch?.name,
          sectionNumber,
          year,
          semester,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }
      router.push("/student/dashboard");
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
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
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
          <div>
            <h1 className="text-white font-medium text-sm">
              Assignment Feedback Loop
            </h1>
            <p className="text-white/60 text-xs">
              IPS Academy, Indore — Student Setup
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-6" style={{ backgroundColor: "#0f0f23" }}>
          <div className="flex items-center gap-2 mb-2">
            {([1, 2, 3] as Step[]).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
                  style={{
                    backgroundColor:
                      step >= s ? "#8B1A1A" : "rgba(255,255,255,0.1)",
                    color: step >= s ? "#fff" : "rgba(255,255,255,0.3)",
                  }}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className="h-0.5 w-12 rounded"
                    style={{
                      backgroundColor:
                        step > s ? "#8B1A1A" : "rgba(255,255,255,0.1)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs mb-5">
            {step === 1 && "Step 1 — Select Branch"}
            {step === 2 && "Step 2 — Section & Year"}
            {step === 3 && "Step 3 — Confirm Details"}
          </p>
        </div>

        {/* Body */}
        <div
          className="px-6 pb-8 space-y-4"
          style={{ backgroundColor: "#0f0f23" }}
        >
          {/* STEP 1 */}
          {step === 1 && (
            <>
              <div>
                <label className="text-white/50 text-xs block mb-1">
                  Branch
                </label>
                <select
                  value={branchCode}
                  onChange={(e) => {
                    setBranchCode(e.target.value);
                    setSubBranchCode("");
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none appearance-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <option value="" style={{ backgroundColor: "#1a1a2e" }}>
                    Select Branch
                  </option>
                  {BRANCHES.map((b) => (
                    <option
                      key={b.code}
                      value={b.code}
                      style={{ backgroundColor: "#1a1a2e" }}
                    >
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-white/50 text-xs block mb-1">
                  Sub-Branch / Specialization
                </label>
                <select
                  value={subBranchCode}
                  onChange={(e) => setSubBranchCode(e.target.value)}
                  disabled={!branchCode}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none appearance-none disabled:opacity-40"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <option value="" style={{ backgroundColor: "#1a1a2e" }}>
                    Select Sub-Branch
                  </option>
                  {selectedBranch?.subBranches.map((s) => (
                    <option
                      key={s.code}
                      value={s.code}
                      style={{ backgroundColor: "#1a1a2e" }}
                    >
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <div>
                <label className="text-white/50 text-xs block mb-2">Year</label>
                <div className="grid grid-cols-4 gap-2">
                  {YEARS.map((y) => (
                    <button
                      key={y}
                      onClick={() => {
                        setYear(y);
                        setSemester("");
                      }}
                      className="py-2 rounded-lg text-sm transition-all"
                      style={{
                        backgroundColor:
                          year === y ? "#8B1A1A" : "rgba(255,255,255,0.07)",
                        color: year === y ? "#fff" : "rgba(255,255,255,0.5)",
                        border:
                          year === y
                            ? "1px solid #8B1A1A"
                            : "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      Year {y}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-white/50 text-xs block mb-2">
                  Semester
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableSemesters.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSemester(s)}
                      disabled={!year}
                      className="py-2 rounded-lg text-sm transition-all disabled:opacity-30"
                      style={{
                        backgroundColor:
                          semester === s ? "#8B1A1A" : "rgba(255,255,255,0.07)",
                        color:
                          semester === s ? "#fff" : "rgba(255,255,255,0.5)",
                        border:
                          semester === s
                            ? "1px solid #8B1A1A"
                            : "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      Semester {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-white/50 text-xs block mb-2">
                  Section
                </label>
                <div className="flex gap-2">
                  {SECTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSectionNumber(s)}
                      className="flex-1 py-2 rounded-lg text-sm transition-all"
                      style={{
                        backgroundColor:
                          sectionNumber === s
                            ? "#8B1A1A"
                            : "rgba(255,255,255,0.07)",
                        color:
                          sectionNumber === s
                            ? "#fff"
                            : "rgba(255,255,255,0.5)",
                        border:
                          sectionNumber === s
                            ? "1px solid #8B1A1A"
                            : "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* STEP 3 — Confirm */}
          {step === 3 && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <h3 className="text-white text-sm font-medium mb-3">
                Confirm your details
              </h3>
              {[
                { label: "Branch", value: selectedBranch?.name },
                { label: "Sub-Branch", value: selectedSubBranch?.name },
                { label: "Year", value: `Year ${year}` },
                { label: "Semester", value: `Semester ${semester}` },
                { label: "Section", value: `Section ${sectionNumber}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-white/40 text-xs">{label}</span>
                  <span className="text-white text-sm">{value}</span>
                </div>
              ))}
              <p className="text-white/30 text-xs pt-2 border-t border-white/10">
                These details cannot be changed after setup. Contact admin if
                incorrect.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button
                onClick={() => {
                  setStep((step - 1) as Step);
                  setError("");
                }}
                className="flex-1 py-3 rounded-lg text-sm"
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={
                step === 1
                  ? handleStep1Next
                  : step === 2
                    ? handleStep2Next
                    : handleSubmit
              }
              disabled={loading}
              className="flex-1 py-3 rounded-lg text-white text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: "#8B1A1A" }}
            >
              {loading
                ? "Saving..."
                : step === 3
                  ? "Confirm & Continue"
                  : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
