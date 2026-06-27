"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface FacultySection {
  id: string;
  sectionId: string;
  subjectName: string;
  subjectCode: string;
  section: {
    sectionNumber: number;
    year: number;
    subBranch: {
      name: string;
      code: string;
    };
  };
}

export default function CreateAssignmentPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [facultySections, setFacultySections] = useState<FacultySection[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);

  // Form state
  const [sectionId, setSectionId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [deadline, setDeadline] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Derived — selected section details
  const selectedSection = facultySections.find(
    (fs) => fs.sectionId === sectionId,
  );

  useEffect(() => {
    fetch("/api/faculty/assignments")
      .then((r) => r.json())
      .then((data) => {
        setFacultySections(data.facultySections ?? []);
        setLoadingSections(false);
      })
      .catch(() => setLoadingSections(false));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setReferenceFile(file);
  };

  const handleSubmit = async (status: "draft" | "active") => {
    setError("");

    if (
      !sectionId ||
      !title.trim() ||
      !description.trim() ||
      !maxMarks ||
      !deadline
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (Number(maxMarks) < 1 || Number(maxMarks) > 200) {
      setError("Max marks must be between 1 and 200.");
      return;
    }

    if (new Date(deadline) <= new Date()) {
      setError("Deadline must be in the future.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("sectionId", sectionId);
      formData.append("subjectName", selectedSection?.subjectName ?? "");
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("maxMarks", maxMarks);
      formData.append("deadline", deadline);
      formData.append("status", status);
      if (referenceFile) formData.append("referenceFile", referenceFile);

      const res = await fetch("/api/faculty/assignments", {
        method: "POST",
        body: formData,
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

  // Min datetime for deadline input (now)
  const minDatetime = new Date(Date.now() + 60 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: "#1a1a2e" }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="rounded-2xl overflow-hidden shadow-2xl mb-6">
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
              <p className="text-white/60 text-xs">Create New Assignment</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: "#0f0f23" }}
        >
          <div className="px-6 py-6 space-y-5">
            {/* Section Selector */}
            <div>
              <label className="text-white/50 text-xs block mb-1">
                Section & Subject <span className="text-red-400">*</span>
              </label>
              {loadingSections ? (
                <div
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white/30"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  Loading your sections...
                </div>
              ) : (
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none appearance-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <option value="" style={{ backgroundColor: "#1a1a2e" }}>
                    Select Section
                  </option>
                  {facultySections.map((fs) => (
                    <option
                      key={fs.id}
                      value={fs.sectionId}
                      style={{ backgroundColor: "#1a1a2e" }}
                    >
                      {fs.section.subBranch.name} — Section{" "}
                      {fs.section.sectionNumber} — Year {fs.section.year} (
                      {fs.subjectName})
                    </option>
                  ))}
                </select>
              )}
              {selectedSection && (
                <p className="text-white/30 text-xs mt-1.5">
                  Subject Code: {selectedSection.subjectCode} · Year{" "}
                  {selectedSection.section.year}
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="text-white/50 text-xs block mb-1">
                Assignment Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Unit 3 — Neural Networks Assignment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-white/25 outline-none"
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-white/50 text-xs block mb-1">
                Instructions / Description{" "}
                <span className="text-red-400">*</span>
              </label>
              <textarea
                placeholder="Describe the assignment, expected format, and evaluation criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-white/25 outline-none resize-none"
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            </div>

            {/* Max Marks + Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/50 text-xs block mb-1">
                  Max Marks <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                  min={1}
                  max={200}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-white/25 outline-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                />
              </div>
              <div>
                <label className="text-white/50 text-xs block mb-1">
                  Deadline <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={minDatetime}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    colorScheme: "dark",
                  }}
                />
              </div>
            </div>

            {/* Reference File */}
            <div>
              <label className="text-white/50 text-xs block mb-1">
                Reference File{" "}
                <span className="text-white/30">
                  (optional — question paper or reference)
                </span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-4 rounded-lg text-sm cursor-pointer flex items-center gap-3 transition-all"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: referenceFile
                    ? "1px solid rgba(139,26,26,0.6)"
                    : "1px dashed rgba(255,255,255,0.2)",
                }}
              >
                <span className="text-lg">📎</span>
                {referenceFile ? (
                  <div className="flex-1">
                    <p className="text-white text-sm">{referenceFile.name}</p>
                    <p className="text-white/30 text-xs">
                      {(referenceFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <p className="text-white/30">Click to attach PDF or image</p>
                )}
                {referenceFile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setReferenceFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-white/30 hover:text-red-400 text-xs transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => router.back()}
                className="px-5 py-3 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit("draft")}
                disabled={loading}
                className="flex-1 py-3 rounded-lg text-sm transition-all disabled:opacity-60"
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                {loading ? "Saving..." : "Save as Draft"}
              </button>
              <button
                onClick={() => handleSubmit("active")}
                disabled={loading}
                className="flex-1 py-3 rounded-lg text-white text-sm font-medium disabled:opacity-60"
                style={{ backgroundColor: "#8B1A1A" }}
              >
                {loading ? "Publishing..." : "Publish →"}
              </button>
            </div>

            <p className="text-white/20 text-xs text-center">
              Draft — only visible to you. Published — visible to all students
              in this section.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
