"use client";

import { useEffect } from "react";
import { Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  projectName: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({ open, projectName, loading, onConfirm, onCancel }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.6)" }} />
      <div
        className="relative rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col gap-5"
        style={{ background: "#1A1D2E", border: "1px solid #2D3154" }}
      >
        <div
          className="flex items-center justify-center w-10 h-10 rounded-full mx-auto"
          style={{ background: "rgba(239,68,68,0.12)" }}
        >
          <Trash2 size={17} style={{ color: "#EF4444" }} />
        </div>

        <div className="text-center">
          <h2 className="text-base font-semibold" style={{ color: "#F0F2FF" }}>Delete project?</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "#8B8FA8" }}>
            <span className="font-medium" style={{ color: "#F0F2FF" }}>{projectName}</span>{" "}
            will be removed from monitoring. This cannot be undone.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: "#2D3154", color: "#8B8FA8" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#EF4444" }}
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
