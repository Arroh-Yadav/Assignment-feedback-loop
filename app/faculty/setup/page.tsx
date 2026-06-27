"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BRANCHES, YEARS } from "@/lib/setupData";

type Step = 1 | 2 | 3 | 4 | 5;

interface SectionSubject {
  sectionNumber: number;
  subjectName: string;
  subjectCode: string;
}

export default function FacultySetupPage() {
  const router = useRouter();

  const [branchCode, setBranchCode] = useState("");
  const [subBranchCode, setSubBranchCode] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [totalSections, setTotalSections] = useState<number | "">(1);
  const [selectedSections, setSelectedSections] = useState<number[]>([]);
  const [sectionSubjects, setSectionSubjects] = useState<SectionSubject[]>([]);

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedBranch = BRANCHES.find((b) => b.code === branchCode);
  const selectedSubBranch = selectedBranch?.subBranches.find(
    (s) => s.code === subBranchCode,
  );
  const allSectionNumbers = totalSections
    ? Array.from({ length: Number(totalSections) }, (_, i) => i + 1)
    : [];

  const toggleSection = (n: number) => {
    setSelectedSections((prev) =>
      prev.includes(n) ? prev.filter((s) => s !== n) : [...prev, n],
    );
  };

  const handleStep1Next = () => {
    if (!branchCode || !subBranchCode || !year) {
      setError("Please select Branch, Sub-Branch, and Year.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleStep2Next = () => {
    if (!totalSections || Number(totalSections) < 1) {
      setError("Enter a valid number of sections.");
      return;
    }
    setError("");
    setStep(3);
  };

  const handleStep3Next = () => {
    if (selectedSections.length === 0) {
      setError("Select at least one section you teach.");
      return;
    }
    const sorted = [...selectedSections].sort((a, b) => a - b);
    setSectionSubjects(
      sorted.map((n) => ({
        sectionNumber: n,
        subjectName: "",
        subjectCode: "",
      })),
    );
    setError("");
    setStep(4);
  };

  const handleSubjectChange = (
    sectionNumber: number,
    field: "subjectName" | "subjectCode",
    value: string,
  ) => {
    setSectionSubjects((prev) =>
      prev.map((ss) =>
        ss.sectionNumber === sectionNumber ? { ...ss, [field]: value } : ss,
      ),
    );
  };

  const handleStep4Next = () => {
    const incomplete = sectionSubjects.some(
      (ss) => !ss.subjectName.trim() || !ss.subjectCode.trim(),
    );
    if (incomplete) {
      setError("Please fill in subject name and code for every section.");
      return;
    }
    setError("");
    setStep(5);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/faculty/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchCode,
          branchName: selectedBranch?.name,
          subBranchCode,
          subBranchName: selectedSubBranch?.name,
          totalSections: Number(totalSections),
          sectionSubjects,
          year,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }
      router.push("/faculty/dashboard");
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  const STEP_LABELS: Record<Step, string> = {
    1: "Branch & Year",
    2: "Total Sections",
    3: "Sections You Teach",
    4: "Subject Details",
    5: "Confirm",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-10"
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
              IPS Academy, Indore — Faculty Setup
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-6" style={{ backgroundColor: "#0f0f23" }}>
          <div className="flex items-center gap-1.5 mb-2">
            {([1, 2, 3, 4, 5] as Step[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
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
                {s < 5 && (
                  <div
                    className="h-0.5 w-8 rounded"
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
            Step {step} — {STEP_LABELS[step]}
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
              <div>
                <label className="text-white/50 text-xs block mb-2">
                  Year of Students You Teach
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {YEARS.map((y) => (
                    <button
                      key={y}
                      onClick={() => setYear(y)}
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
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <label className="text-white/50 text-xs block mb-2">
                How many sections exist in {selectedSubBranch?.name} Year {year}
                ?
              </label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTotalSections(n)}
                    className="w-12 h-12 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor:
                        totalSections === n
                          ? "#8B1A1A"
                          : "rgba(255,255,255,0.07)",
                      color:
                        totalSections === n ? "#fff" : "rgba(255,255,255,0.5)",
                      border:
                        totalSections === n
                          ? "1px solid #8B1A1A"
                          : "1px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-white/30 text-xs mt-3">
                This creates Section 1 through Section {totalSections || "N"}{" "}
                for your sub-branch.
              </p>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <label className="text-white/50 text-xs block mb-2">
                Which sections do you personally teach?
              </label>
              <div className="flex gap-2 flex-wrap">
                {allSectionNumbers.map((n) => (
                  <button
                    key={n}
                    onClick={() => toggleSection(n)}
                    className="w-12 h-12 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: selectedSections.includes(n)
                        ? "#8B1A1A"
                        : "rgba(255,255,255,0.07)",
                      color: selectedSections.includes(n)
                        ? "#fff"
                        : "rgba(255,255,255,0.5)",
                      border: selectedSections.includes(n)
                        ? "1px solid #8B1A1A"
                        : "1px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-white/30 text-xs mt-3">
                Tap to toggle. Multiple selections allowed.
              </p>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-white/50 text-xs">
                Enter the subject you teach in each selected section.
              </p>
              {sectionSubjects.map((ss) => (
                <div
                  key={ss.sectionNumber}
                  className="rounded-xl p-4 space-y-3"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <p className="text-white text-sm font-medium">
                    Section {ss.sectionNumber}
                  </p>
                  <div>
                    <label className="text-white/40 text-xs block mb-1">
                      Subject Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Machine Learning"
                      value={ss.subjectName}
                      onChange={(e) =>
                        handleSubjectChange(
                          ss.sectionNumber,
                          "subjectName",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/25 outline-none"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-white/40 text-xs block mb-1">
                      Subject Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CS601"
                      value={ss.subjectCode}
                      onChange={(e) =>
                        handleSubjectChange(
                          ss.sectionNumber,
                          "subjectCode",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/25 outline-none"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 5 — Confirm */}
          {step === 5 && (
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
                { label: "Total Sections", value: `${totalSections} sections` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-white/40 text-xs">{label}</span>
                  <span className="text-white text-sm">{value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <p className="text-white/40 text-xs mb-1">
                  Subjects per Section
                </p>
                {sectionSubjects.map((ss) => (
                  <div
                    key={ss.sectionNumber}
                    className="flex justify-between items-center"
                  >
                    <span className="text-white/40 text-xs">
                      Section {ss.sectionNumber}
                    </span>
                    <span className="text-white text-sm">
                      {ss.subjectName}{" "}
                      <span className="text-white/40">({ss.subjectCode})</span>
                    </span>
                  </div>
                ))}
              </div>
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
                    : step === 3
                      ? handleStep3Next
                      : step === 4
                        ? handleStep4Next
                        : handleSubmit
              }
              disabled={loading}
              className="flex-1 py-3 rounded-lg text-white text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: "#8B1A1A" }}
            >
              {loading
                ? "Saving..."
                : step === 5
                  ? "Confirm & Continue"
                  : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
