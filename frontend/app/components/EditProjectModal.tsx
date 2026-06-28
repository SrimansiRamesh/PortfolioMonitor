"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { updateProject } from "../lib/api";
import { Platform, Project } from "../lib/types";

interface Props {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onUpdated: (project: Project) => void;
}

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "render",  label: "Render"  },
  { value: "railway", label: "Railway" },
  { value: "fly",     label: "Fly.io"  },
  { value: "other",   label: "Other"   },
];

export default function EditProjectModal({ open, project, onClose, onUpdated }: Props) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<Platform>("render");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && project) {
      setName(project.name);
      setUrl(project.url);
      setPlatform(project.platform);
      setError(null);
    }
  }, [open, project]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !name.trim() || !url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await updateProject(project.id, {
        name: name.trim(),
        url: url.trim(),
        platform,
      });
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to update project.");
    } finally {
      setLoading(false);
    }
  }

  if (!open || !project) return null;

  const inputStyle = {
    background: "#0F1117",
    border: "1px solid #2D3154",
    color: "#F0F2FF",
    outline: "none",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.6)" }} />
      <div
        className="relative rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        style={{ background: "#1A1D2E", border: "1px solid #2D3154" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: "#F0F2FF" }}>Edit project</h2>
          <button onClick={onClose} className="transition-opacity hover:opacity-70" style={{ color: "#8B8FA8" }}>
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium" style={{ color: "#8B8FA8" }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-lg px-3 py-2 text-sm"
              style={{ ...inputStyle, caretColor: "#6366F1" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium" style={{ color: "#8B8FA8" }}>URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="rounded-lg px-3 py-2 text-sm"
              style={{ ...inputStyle, caretColor: "#6366F1" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium" style={{ color: "#8B8FA8" }}>Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="rounded-lg px-3 py-2 text-sm"
              style={inputStyle}
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-[13px]" style={{ color: "#EF4444" }}>{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim() || !url.trim()}
            className="mt-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#6366F1" }}
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
