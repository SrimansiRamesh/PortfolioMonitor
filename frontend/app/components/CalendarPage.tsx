"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Zap, ZapOff } from "lucide-react";
import {
  CalendarEvent,
  fetchCalendarEvents,
  fetchCalendarStatus,
  updateWarmupSettings,
} from "../lib/api";

// ── constants ────────────────────────────────────────────────────────────────

const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_PX = 64;
const TOTAL_PX = (END_HOUR - START_HOUR) * HOUR_PX;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const GCal_COLORS: Record<string, string> = {
  "1": "#7986CB", "2": "#33B679", "3": "#8E24AA", "4": "#E67C73",
  "5": "#F6BF26", "6": "#F4511E", "7": "#039BE5", "8": "#616161",
  "9": "#3F51B5", "10": "#0B8043", "11": "#D50000",
};
const DEFAULT_COLOR = "#6366F1";

const ALL_KEYWORDS = ["interview", "demo", "technical", "screen", "take-home"];

// ── helpers ──────────────────────────────────────────────────────────────────

function getMondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function fmtLabel(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

function fmtHeaderMonth(days: Date[]): string {
  const a = days[0];
  const b = days[6];
  if (a.getMonth() === b.getMonth()) {
    return a.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  const am = a.toLocaleDateString(undefined, { month: "short" });
  const bm = b.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  return `${am} – ${bm}`;
}

function eventColor(e: CalendarEvent): string {
  return e.color_id ? (GCal_COLORS[e.color_id] ?? DEFAULT_COLOR) : DEFAULT_COLOR;
}

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const ds = dateStr(day);
  return events.filter((e) => !e.all_day && e.start.startsWith(ds));
}

function allDayForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const ds = dateStr(day);
  return events.filter((e) => e.all_day && e.start.startsWith(ds));
}

interface EventPos { top: number; height: number }
function positionEvent(e: CalendarEvent): EventPos | null {
  const s = new Date(e.start);
  const en = new Date(e.end);
  if (isNaN(s.getTime()) || isNaN(en.getTime())) return null;
  const sh = s.getHours() + s.getMinutes() / 60;
  const eh = en.getHours() + en.getMinutes() / 60;
  const top = (Math.max(sh, START_HOUR) - START_HOUR) * HOUR_PX;
  const bot = (Math.min(eh, END_HOUR) - START_HOUR) * HOUR_PX;
  return { top, height: Math.max(bot - top, 22) };
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// ── EventPopover ─────────────────────────────────────────────────────────────

function EventPopover({
  event,
  anchorRef,
  onClose,
}: {
  event: CalendarEvent;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  const color = eventColor(event);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  // Position relative to anchor
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });
  useEffect(() => {
    if (!anchorRef.current || !ref.current) return;
    const ar = anchorRef.current.getBoundingClientRect();
    const pr = ref.current.getBoundingClientRect();
    const left = Math.min(ar.right + 8, window.innerWidth - pr.width - 8);
    const top = Math.max(8, ar.top - pr.height / 2 + ar.height / 2);
    setStyle({ position: "fixed", left, top, opacity: 1, zIndex: 50 });
  }, [anchorRef]);

  return (
    <div
      ref={ref}
      style={{
        ...style,
        background: "#1A1D2E",
        border: "1px solid #2D3154",
        borderRadius: "12px",
        width: "240px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <div className="px-4 pt-3 pb-2" style={{ borderBottom: "1px solid #2D3154" }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
              style={{ background: color }}
            />
            <p className="text-[13px] font-semibold leading-tight" style={{ color: "#F0F2FF" }}>
              {event.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-0.5 rounded hover:opacity-70"
            style={{ color: "#8B8FA8" }}
          >
            <X size={13} />
          </button>
        </div>
      </div>
      <div className="px-4 py-3 flex flex-col gap-1.5">
        {!event.all_day && (
          <p className="text-[12px]" style={{ color: "#8B8FA8" }}>
            {fmtTime(event.start)} – {fmtTime(event.end)}
          </p>
        )}
        {event.all_day && (
          <p className="text-[12px]" style={{ color: "#8B8FA8" }}>All day</p>
        )}
      </div>
    </div>
  );
}

// ── EventBlock ────────────────────────────────────────────────────────────────

function EventBlock({ event }: { event: CalendarEvent }) {
  const pos = positionEvent(event);
  if (!pos) return null;
  const color = eventColor(event);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        ref={ref}
        onClick={() => setOpen((v) => !v)}
        className="absolute rounded-md px-1.5 py-1 overflow-hidden cursor-pointer select-none"
        style={{
          top: pos.top + 1,
          height: pos.height - 2,
          left: 2,
          right: 2,
          background: `${color}1A`,
          borderLeft: `2px solid ${color}`,
          transition: "opacity 0.1s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        <p
          className="text-[11px] font-medium leading-tight truncate"
          style={{ color }}
        >
          {event.title}
        </p>
        {pos.height > 30 && (
          <p className="text-[10px] leading-tight mt-0.5" style={{ color: `${color}99` }}>
            {fmtTime(event.start)}
          </p>
        )}
      </div>
      {open && (
        <EventPopover event={event} anchorRef={ref} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

// ── CalendarPage ──────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [monday, setMonday] = useState(() => getMondayOf(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [warmupEnabled, setWarmupEnabled] = useState(true);
  const [minutesBefore, setMinutesBefore] = useState(45);
  const [keywords, setKeywords] = useState<string[]>(ALL_KEYWORDS);
  const [customKw, setCustomKw] = useState("");
  const [saving, setSaving] = useState(false);

  const days = weekDays(monday);

  const loadStatus = useCallback(async () => {
    try {
      const s = await fetchCalendarStatus();
      setConnected(s.connected);
      setWarmupEnabled(s.settings.warmup_enabled ?? true);
      setMinutesBefore(s.settings.minutes_before);
      setKeywords(s.settings.keywords);
    } catch {}
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const start = days[0].toISOString();
      const end = new Date(days[6].getTime() + 86399999).toISOString();
      const data = await fetchCalendarEvents(start, end);
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [monday]);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Current-time indicator
  const now = new Date();
  const nowTop = (now.getHours() + now.getMinutes() / 60 - START_HOUR) * HOUR_PX;
  const showNow = nowTop >= 0 && nowTop <= TOTAL_PX;
  const todayStr = dateStr(now);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current && showNow) {
      scrollRef.current.scrollTop = Math.max(0, nowTop - 120);
    }
  }, []);

  async function toggleWarmup() {
    const next = !warmupEnabled;
    setWarmupEnabled(next);
    try {
      await updateWarmupSettings({ warmup_enabled: next });
    } catch {
      setWarmupEnabled(!next);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await updateWarmupSettings({ minutes_before: minutesBefore, keywords, warmup_enabled: warmupEnabled });
    } finally {
      setSaving(false);
    }
  }

  function toggleKeyword(kw: string) {
    setKeywords((p) => p.includes(kw) ? p.filter((k) => k !== kw) : [...p, kw]);
  }

  function addCustomKw() {
    const t = customKw.trim().toLowerCase();
    if (t && !keywords.includes(t)) setKeywords((p) => [...p, t]);
    setCustomKw("");
  }

  const hasAllDay = days.some((d) => allDayForDay(events, d).length > 0);

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#0F1117" }}>
      {/* ── Left: calendar ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Week nav bar */}
        <div
          className="flex items-center gap-3 px-5 py-3 shrink-0"
          style={{ borderBottom: "1px solid #2D3154" }}
        >
          <span className="text-[14px] font-semibold" style={{ color: "#F0F2FF" }}>
            {fmtHeaderMonth(days)}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMonday(addDays(monday, -7))}
              className="w-7 h-7 flex items-center justify-center rounded-md"
              style={{ background: "#1A1D2E", color: "#8B8FA8" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#2D3154")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#1A1D2E")}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setMonday(getMondayOf(new Date()))}
              className="px-2.5 py-1 rounded-md text-[12px] font-medium"
              style={{ background: "#1A1D2E", color: "#8B8FA8" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#2D3154")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#1A1D2E")}
            >
              Today
            </button>
            <button
              onClick={() => setMonday(addDays(monday, 7))}
              className="w-7 h-7 flex items-center justify-center rounded-md"
              style={{ background: "#1A1D2E", color: "#8B8FA8" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#2D3154")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#1A1D2E")}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {loading && (
            <div
              className="w-3.5 h-3.5 rounded-full animate-spin ml-1"
              style={{ border: "2px solid #2D3154", borderTopColor: "#6366F1" }}
            />
          )}

          {!connected && (
            <span className="text-[12px]" style={{ color: "#8B8FA8" }}>
              Calendar not connected
            </span>
          )}
        </div>

        {/* Day headers */}
        <div
          className="flex shrink-0"
          style={{ borderBottom: "1px solid #2D3154", background: "#0F1117" }}
        >
          <div className="w-14 shrink-0" />
          {days.map((day, i) => {
            const isToday = dateStr(day) === todayStr;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center py-2 gap-0.5"
                style={{ borderLeft: "1px solid #1A1D2E" }}
              >
                <span
                  className="text-[10px] uppercase tracking-wide font-medium"
                  style={{ color: isToday ? "#6366F1" : "#8B8FA8" }}
                >
                  {DAY_LABELS[(day.getDay() + 6) % 7]}
                </span>
                <span
                  className="text-[14px] font-bold w-7 h-7 flex items-center justify-center rounded-full"
                  style={{
                    background: isToday ? "#6366F1" : "transparent",
                    color: isToday ? "#fff" : "#F0F2FF",
                  }}
                >
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* All-day row */}
        {hasAllDay && (
          <div
            className="flex shrink-0"
            style={{ borderBottom: "1px solid #2D3154", minHeight: 28 }}
          >
            <div
              className="w-14 shrink-0 flex items-center justify-end pr-2"
            >
              <span className="text-[9px] uppercase tracking-wide" style={{ color: "#8B8FA8" }}>
                all‑day
              </span>
            </div>
            {days.map((day, i) => (
              <div
                key={i}
                className="flex-1 px-0.5 py-0.5 flex flex-col gap-0.5"
                style={{ borderLeft: "1px solid #1A1D2E" }}
              >
                {allDayForDay(events, day).map((e) => (
                  <div
                    key={e.id}
                    className="rounded px-1.5 text-[10px] font-medium truncate py-0.5"
                    style={{ background: `${eventColor(e)}22`, color: eventColor(e) }}
                  >
                    {e.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Time grid */}
        <div className="flex-1 overflow-auto" ref={scrollRef}>
          <div className="flex" style={{ height: TOTAL_PX, position: "relative" }}>
            {/* Time labels */}
            <div className="w-14 shrink-0 relative select-none">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute w-full flex items-start justify-end pr-2"
                  style={{ top: (h - START_HOUR) * HOUR_PX - 8, height: HOUR_PX }}
                >
                  <span className="text-[10px]" style={{ color: "#8B8FA8" }}>
                    {fmtLabel(h)}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day, i) => {
              const isToday = dateStr(day) === todayStr;
              const dayEvents = eventsForDay(events, day);
              return (
                <div
                  key={i}
                  className="flex-1 relative"
                  style={{ borderLeft: "1px solid #1A1D2E" }}
                >
                  {/* Hour lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute w-full pointer-events-none"
                      style={{
                        top: (h - START_HOUR) * HOUR_PX,
                        height: HOUR_PX,
                        borderTop: `1px solid ${h % 2 === 0 ? "#1A1D2E" : "#141621"}`,
                      }}
                    />
                  ))}

                  {/* Today highlight */}
                  {isToday && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: "rgba(99,102,241,0.025)" }}
                    />
                  )}

                  {/* Now line */}
                  {isToday && showNow && (
                    <div
                      className="absolute left-0 right-0 flex items-center pointer-events-none"
                      style={{ top: nowTop, zIndex: 5 }}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: "#EF4444", marginLeft: -4 }}
                      />
                      <div className="flex-1 h-px" style={{ background: "#EF4444", opacity: 0.6 }} />
                    </div>
                  )}

                  {/* Events */}
                  {dayEvents.map((e) => (
                    <EventBlock key={e.id} event={e} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right: settings sidebar ── */}
      <div
        className="w-60 shrink-0 flex flex-col overflow-y-auto"
        style={{ borderLeft: "1px solid #2D3154", background: "#0B0D14" }}
      >
        {/* Warmup header */}
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #2D3154" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#8B8FA8" }}>
            Pre-warm
          </p>

          {/* Toggle row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium" style={{ color: "#F0F2FF" }}>Auto warmup</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#8B8FA8" }}>
                {warmupEnabled ? "Active before events" : "Disabled"}
              </p>
            </div>
            <button
              onClick={toggleWarmup}
              disabled={!connected}
              className="relative w-10 h-[22px] rounded-full transition-colors disabled:opacity-40"
              style={{ background: warmupEnabled && connected ? "#6366F1" : "#2D3154" }}
              title={connected ? undefined : "Calendar not connected"}
            >
              <span
                className="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200"
                style={{ transform: warmupEnabled && connected ? "translateX(18px)" : "translateX(0)" }}
              />
            </button>
          </div>
        </div>

        {/* Minutes before */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #2D3154", opacity: warmupEnabled && connected ? 1 : 0.4 }}>
          <p className="text-[11px] font-medium mb-2" style={{ color: "#8B8FA8" }}>
            Warm up how early
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={5}
              max={120}
              value={minutesBefore}
              disabled={!warmupEnabled || !connected}
              onChange={(e) => setMinutesBefore(Number(e.target.value))}
              className="w-16 rounded-lg px-2 py-1.5 text-[13px]"
              style={{
                background: "#1A1D2E",
                border: "1px solid #2D3154",
                color: "#F0F2FF",
                outline: "none",
                caretColor: "#6366F1",
              }}
            />
            <span className="text-[12px]" style={{ color: "#8B8FA8" }}>min before</span>
          </div>
        </div>

        {/* Keywords */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #2D3154", opacity: warmupEnabled && connected ? 1 : 0.4 }}>
          <p className="text-[11px] font-medium mb-2" style={{ color: "#8B8FA8" }}>Trigger keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_KEYWORDS.map((kw) => {
              const on = keywords.includes(kw);
              return (
                <button
                  key={kw}
                  onClick={() => toggleKeyword(kw)}
                  disabled={!warmupEnabled || !connected}
                  className="px-2 py-0.5 rounded text-[11px] font-medium transition-colors"
                  style={{
                    background: on ? "rgba(99,102,241,0.2)" : "#1A1D2E",
                    color: on ? "#818cf8" : "#8B8FA8",
                    border: `1px solid ${on ? "rgba(99,102,241,0.35)" : "transparent"}`,
                  }}
                >
                  {kw}
                </button>
              );
            })}
            {keywords.filter((k) => !ALL_KEYWORDS.includes(k)).map((kw) => (
              <span
                key={kw}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium"
                style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.35)" }}
              >
                {kw}
                <button
                  onClick={() => toggleKeyword(kw)}
                  className="hover:opacity-70"
                  disabled={!warmupEnabled || !connected}
                >
                  <X size={9} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1.5 mt-2">
            <input
              type="text"
              value={customKw}
              disabled={!warmupEnabled || !connected}
              onChange={(e) => setCustomKw(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomKw(); } }}
              placeholder="Add keyword…"
              className="flex-1 rounded-lg px-2 py-1 text-[11px] min-w-0"
              style={{
                background: "#1A1D2E",
                border: "1px solid #2D3154",
                color: "#F0F2FF",
                outline: "none",
                caretColor: "#6366F1",
              }}
            />
            <button
              onClick={addCustomKw}
              disabled={!customKw.trim() || !warmupEnabled || !connected}
              className="px-2 py-1 rounded-lg text-[11px] font-medium disabled:opacity-40"
              style={{ background: "#2D3154", color: "#8B8FA8" }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Save button */}
        <div className="px-4 py-3">
          <button
            onClick={saveSettings}
            disabled={saving || !connected || keywords.length === 0}
            className="w-full py-2 rounded-lg text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: "#6366F1" }}
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>

        {/* Status */}
        {connected && (
          <div className="px-4 pb-4 mt-auto">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: warmupEnabled ? "rgba(99,102,241,0.08)" : "#1A1D2E" }}
            >
              {warmupEnabled ? (
                <Zap size={12} style={{ color: "#6366F1", flexShrink: 0 }} />
              ) : (
                <ZapOff size={12} style={{ color: "#8B8FA8", flexShrink: 0 }} />
              )}
              <span className="text-[11px]" style={{ color: warmupEnabled ? "#818cf8" : "#8B8FA8" }}>
                {warmupEnabled
                  ? `Warms up ${minutesBefore}m before events`
                  : "Warmup disabled"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
