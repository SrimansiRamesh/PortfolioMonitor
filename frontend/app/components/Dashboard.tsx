"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, LayoutGrid, LogOut, Plus } from "lucide-react";
import { fetchProjects, fetchPings } from "../lib/api";
import { clearToken, getTokenPayload } from "../lib/auth";
import { Project, ProjectWithPings } from "../lib/types";
import ProjectCard from "./ProjectCard";
import AddProjectModal from "./AddProjectModal";
import CalendarPage from "./CalendarPage";
import EmptyState from "./EmptyState";
import ErrorBanner from "./ErrorBanner";

const POLL_INTERVAL = 30_000;

function summarize(projects: ProjectWithPings[]) {
  const counts = { healthy: 0, cold_start: 0, outage: 0 };
  for (const p of projects) {
    const cls = p.pings[0]?.classification ?? null;
    if (cls === "healthy") counts.healthy++;
    else if (cls === "cold_start") counts.cold_start++;
    else if (cls === "outage") counts.outage++;
  }
  return counts;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectWithPings[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<"projects" | "calendar">("projects");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const user = getTokenPayload();

  const loadAll = useCallback(async () => {
    try {
      const raw = await fetchProjects();
      const withPings = await Promise.all(
        raw.map(async (p): Promise<ProjectWithPings> => {
          try {
            const pings = await fetchPings(p.id, 10);
            return { ...p, pings };
          } catch {
            return { ...p, pings: [] };
          }
        })
      );
      setProjects(withPings);
      setApiError(false);
    } catch {
      setApiError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    intervalRef.current = setInterval(loadAll, POLL_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadAll]);

  function handleCreated(project: Project) {
    setProjects((prev) => [...prev, { ...project, pings: [] }]);
    setTimeout(loadAll, 2000);
  }
  function handleDeleted(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }
  function handleRestarted(_id: string) {
    setTimeout(loadAll, 2000);
  }
  function handleEdited(updated: Project) {
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );
  }

  function handleSignOut() {
    clearToken();
    window.location.reload();
  }

  const counts = summarize(projects);

  return (
    <div className="min-h-screen" style={{ background: "#0F1117" }}>
      {apiError && <ErrorBanner />}

      {/* Header */}
      <header
        className="sticky top-0 z-10"
        style={{ background: "#0F1117", borderBottom: "1px solid #2D3154" }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-6">
          <button
            onClick={() => setView("projects")}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="7" fill="#6366F1" />
              <path d="M8 18 Q14 8 20 18" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.4" />
              <path d="M10 18 Q14 11 18 18" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />
              <circle cx="14" cy="18" r="2.5" fill="white" />
            </svg>
            <h1 className="text-[20px] font-bold tracking-tight" style={{ color: "#F0F2FF" }}>
              Portfolio Monitor
            </h1>
          </button>

          {!loading && projects.length > 0 && (
            <div className="flex items-center gap-5 text-[13px]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#10B981" }} />
                <span className="font-semibold" style={{ color: "#10B981" }}>{counts.healthy}</span>
                <span style={{ color: "#8B8FA8" }}>healthy</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#F59E0B" }} />
                <span className="font-semibold" style={{ color: "#F59E0B" }}>{counts.cold_start}</span>
                <span style={{ color: "#8B8FA8" }}>cold start</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#EF4444" }} />
                <span className="font-semibold" style={{ color: "#EF4444" }}>{counts.outage}</span>
                <span style={{ color: "#8B8FA8" }}>outage</span>
              </span>
            </div>
          )}

          <div className="flex-1" />

          {/* View tabs */}
          <div
            className="flex items-center gap-0.5 rounded-lg p-0.5"
            style={{ background: "#1A1D2E" }}
          >
            {(["projects", "calendar"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
                style={{
                  background: view === v ? "#2D3154" : "transparent",
                  color: view === v ? "#F0F2FF" : "#8B8FA8",
                }}
              >
                {v === "projects" ? <LayoutGrid size={13} /> : <Calendar size={13} />}
                {v === "projects" ? "Projects" : "Calendar"}
              </button>
            ))}
          </div>

          {view === "projects" && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ background: "#6366F1" }}
            >
              <Plus size={15} />
              Add
            </button>
          )}

          {/* User avatar + sign out */}
          <div className="flex items-center gap-2">
            {user?.name && (
              <span className="text-[12px] hidden sm:block" style={{ color: "#8B8FA8" }}>
                {user.name}
              </span>
            )}
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
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
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      {view === "calendar" ? (
        <div style={{ height: "calc(100vh - 65px)" }}>
          <CalendarPage />
        </div>
      ) : (
        <main className="max-w-5xl mx-auto px-6 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div
                className="w-5 h-5 rounded-full animate-spin"
                style={{ border: "2px solid #2D3154", borderTopColor: "#6366F1" }}
              />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState onAdd={() => setModalOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onDeleted={handleDeleted}
                  onRestarted={handleRestarted}
                  onEdited={handleEdited}
                />
              ))}
            </div>
          )}
        </main>
      )}

      <AddProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
