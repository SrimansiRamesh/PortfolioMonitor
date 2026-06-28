"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, ChevronUp, X, Zap } from "lucide-react";
import { CalendarStatus, fetchCalendarStatus, updateWarmupSettings } from "../lib/api";

const ALL_KEYWORDS = ["interview", "demo", "technical", "screen", "take-home"];

function formatEventTime(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function CalendarPanel() {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [minutesBefore, setMinutesBefore] = useState(45);
  const [keywords, setKeywords] = useState<string[]>(ALL_KEYWORDS);
  const [customKw, setCustomKw] = useState("");
  const [saving, setSaving] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await fetchCalendarStatus();
      setStatus(s);
      setMinutesBefore(s.settings.minutes_before);
      setKeywords(s.settings.keywords);
    } catch {
      // calendar is optional — fail silently
    }
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5 * 60 * 1000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  async function handleSaveSettings() {
    setSaving(true);
    try {
      await updateWarmupSettings({ minutes_before: minutesBefore, keywords });
      await load();
      setShowSettings(false);
    } finally {
      setSaving(false);
    }
  }

  function toggleKeyword(kw: string) {
    setKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    );
  }

  function addCustomKeyword() {
    const trimmed = customKw.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
    }
    setCustomKw("");
  }

  if (!status) return null;

  const { connected, upcoming_events } = status;
  const warming = connected && upcoming_events.length > 0;

  const inputStyle = {
    background: "#0F1117",
    border: "1px solid #2D3154",
    color: "#F0F2FF",
    outline: "none",
  };

  return (
    <div className="mb-6">
      {/* Main banner */}
      <div
        className="rounded-xl px-5 py-3 flex items-center gap-3"
        style={{
          background: warming ? "rgba(245,158,11,0.08)" : "#1A1D2E",
          border: `1px solid ${warming ? "rgba(245,158,11,0.3)" : "#2D3154"}`,
        }}
      >
        {warming ? (
          <Zap size={16} style={{ color: "#F59E0B", flexShrink: 0 }} />
        ) : (
          <Calendar size={16} style={{ color: connected ? "#10B981" : "#8B8FA8", flexShrink: 0 }} />
        )}

        {!connected ? (
          <span className="text-[13px]" style={{ color: "#8B8FA8" }}>
            Calendar access unavailable — sign out and sign in again to reconnect.
          </span>
        ) : warming ? (
          <span className="text-[13px] font-medium" style={{ color: "#F59E0B" }}>
            Warming up all projects —{" "}
            <span style={{ color: "#F0F2FF" }}>
              {upcoming_events.map((e) => `"${e.title}"`).join(", ")}
            </span>
            {upcoming_events.length === 1 && (
              <span style={{ color: "#8B8FA8" }}>
                {" · "}{formatEventTime(upcoming_events[0].start)}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[13px]" style={{ color: "#8B8FA8" }}>
            <span style={{ color: "#10B981" }}>Calendar connected</span>
            {" · "}No upcoming events detected
          </span>
        )}

        <div className="flex-1" />

        {connected && (
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors"
            style={{ background: "#2D3154", color: "#8B8FA8" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#3a3f6b")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#2D3154")}
          >
            Settings
            {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* Settings panel */}
      {showSettings && connected && (
        <div
          className="rounded-xl mt-2 p-5 flex flex-col gap-5"
          style={{ background: "#1A1D2E", border: "1px solid #2D3154" }}
        >
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium" style={{ color: "#8B8FA8" }}>
              Start warming up
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={5}
                max={120}
                value={minutesBefore}
                onChange={(e) => setMinutesBefore(Number(e.target.value))}
                className="w-20 rounded-lg px-3 py-1.5 text-sm"
                style={{ ...inputStyle, caretColor: "#6366F1" }}
              />
              <span className="text-[13px]" style={{ color: "#8B8FA8" }}>
                minutes before the event
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium" style={{ color: "#8B8FA8" }}>
              Trigger keywords
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_KEYWORDS.map((kw) => (
                <button
                  key={kw}
                  onClick={() => toggleKeyword(kw)}
                  className="px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors"
                  style={{
                    background: keywords.includes(kw) ? "rgba(99,102,241,0.2)" : "#2D3154",
                    color: keywords.includes(kw) ? "#818cf8" : "#8B8FA8",
                    border: `1px solid ${keywords.includes(kw) ? "rgba(99,102,241,0.4)" : "transparent"}`,
                  }}
                >
                  {kw}
                </button>
              ))}
              {keywords.filter((k) => !ALL_KEYWORDS.includes(k)).map((kw) => (
                <span
                  key={kw}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium"
                  style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.4)" }}
                >
                  {kw}
                  <button onClick={() => toggleKeyword(kw)} className="hover:opacity-70">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={customKw}
                onChange={(e) => setCustomKw(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomKeyword(); } }}
                placeholder="Add keyword…"
                className="rounded-lg px-3 py-1.5 text-sm w-40"
                style={{ ...inputStyle, caretColor: "#6366F1" }}
              />
              <button
                onClick={addCustomKeyword}
                disabled={!customKw.trim()}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: "#2D3154", color: "#8B8FA8" }}
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1" style={{ borderTop: "1px solid #2D3154" }}>
            <button
              onClick={handleSaveSettings}
              disabled={saving || keywords.length === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "#6366F1" }}
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
