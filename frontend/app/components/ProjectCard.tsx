"use client";

import { useState } from "react";
import { ExternalLink, RotateCcw, Trash2 } from "lucide-react";
import { ProjectWithPings } from "../lib/types";
import StatusBadge from "./StatusBadge";
import PlatformPill from "./PlatformPill";
import Sparkline from "./Sparkline";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { deleteProject, restartMonitoring } from "../lib/api";

interface Props {
  project: ProjectWithPings;
  onDeleted: (id: string) => void;
  onRestarted: (id: string) => void;
}

const STATUS_BORDER: Record<string, string> = {
  healthy:    "#10B981",
  cold_start: "#F59E0B",
  outage:     "#EF4444",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return "1 hr ago";
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ProjectCard({ project, onDeleted, onRestarted }: Props) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadingRestart, setLoadingRestart] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const latestPing = project.pings[0] ?? null;
  const classification = latestPing?.classification ?? null;
  const responseMs = latestPing?.response_time_ms ?? null;
  const slow = responseMs !== null && responseMs > 1000;
  const accentBorder = (classification && STATUS_BORDER[classification]) || "#2D3154";

  async function handleRestart() {
    setLoadingRestart(true);
    try { await restartMonitoring(project.id); onRestarted(project.id); }
    finally { setLoadingRestart(false); }
  }

  async function handleConfirmDelete() {
    setLoadingDelete(true);
    try { await deleteProject(project.id); onDeleted(project.id); }
    finally { setLoadingDelete(false); setShowDeleteModal(false); }
  }

  return (
    <>
      <div
        className="rounded-xl flex flex-col overflow-hidden"
        style={{
          background: "#1A1D2E",
          border: "1px solid #2D3154",
          borderLeft: `3px solid ${accentBorder}`,
          minHeight: 280,
        }}
      >
        {/* Body */}
        <div className="flex flex-col gap-4 p-5 flex-1">

          {/* Name + platform */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-[16px] font-semibold truncate" style={{ color: "#F0F2FF" }}>
                {project.name}
              </h3>
              <p className="text-[12px] truncate mt-0.5" style={{ color: "#8B8FA8" }}>
                {project.url}
              </p>
            </div>
            <PlatformPill platform={project.platform} />
          </div>

          {/* Status + last ping */}
          <div className="flex items-center justify-between">
            <StatusBadge classification={classification} noPings={project.pings.length === 0} />
            {latestPing && (
              <span className="text-[12px]" style={{ color: "#8B8FA8" }}>
                {timeAgo(latestPing.pinged_at)}
              </span>
            )}
          </div>

          {/* Response time + baseline — same row */}
          <div className="flex items-baseline gap-3">
            {responseMs !== null ? (
              <span
                className="text-[24px] font-semibold leading-none"
                style={{ color: slow ? "#F59E0B" : "#F0F2FF" }}
              >
                {responseMs}
                <span className="text-sm font-normal ml-0.5" style={{ color: "#8B8FA8" }}>ms</span>
              </span>
            ) : (
              <span className="text-[13px] font-medium" style={{ color: "rgba(239,68,68,0.6)" }}>
                No response
              </span>
            )}
            {project.baseline_response_ms !== null && (
              <span className="text-[12px]" style={{ color: "#8B8FA8" }}>
                baseline {project.baseline_response_ms}ms
              </span>
            )}
          </div>

          {/* Sparkline — own row */}
          <div style={{ height: 40 }}>
            <Sparkline pings={project.pings} classification={classification} />
          </div>

        </div>

        {/* Action bar */}
        <div
          className="flex items-center gap-1 px-4 py-3"
          style={{ borderTop: "1px solid #2D3154", background: "#13162A" }}
        >
          <button
            onClick={handleRestart}
            disabled={loadingRestart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors disabled:opacity-50"
            style={{ background: "#2D3154", color: "#8B8FA8" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#3a3f6b")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#2D3154")}
          >
            <RotateCcw size={12} className={loadingRestart ? "animate-spin" : ""} />
            Restart
          </button>
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
            style={{ background: "#2D3154", color: "#8B8FA8" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(99,102,241,0.15)";
              e.currentTarget.style.color = "#6366F1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#2D3154";
              e.currentTarget.style.color = "#8B8FA8";
            }}
          >
            <ExternalLink size={12} />
            Visit
          </a>
          <div className="flex-1" />
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
            style={{ background: "#2D3154", color: "#8B8FA8" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.15)";
              e.currentTarget.style.color = "#EF4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#2D3154";
              e.currentTarget.style.color = "#8B8FA8";
            }}
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </div>

      <ConfirmDeleteModal
        open={showDeleteModal}
        projectName={project.name}
        loading={loadingDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
}
