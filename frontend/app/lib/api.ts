import axios from "axios";
import { getToken, clearToken } from "./auth";
import { Ping, Project, User } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const client = axios.create({ baseURL: BASE, timeout: 10000 });

// Attach JWT to every request
client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear token so the auth gate redirects to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) clearToken();
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────

export async function fetchGoogleAuthUrl(): Promise<string> {
  const { data } = await client.get<{ auth_url: string }>("/auth/google");
  return data.auth_url;
}

export async function fetchMe(): Promise<User> {
  const { data } = await client.get<User>("/auth/me");
  return data;
}

// ── Projects ──────────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  const { data } = await client.get<Project[]>("/projects");
  return data;
}

export async function fetchPings(projectId: string, limit = 10): Promise<Ping[]> {
  const { data } = await client.get<Ping[]>(`/projects/${projectId}/pings`);
  return data.slice(0, limit);
}

export async function createProject(payload: {
  name: string;
  url: string;
  platform: string;
}): Promise<Project> {
  const { data } = await client.post<Project>("/projects", payload);
  return data;
}

export async function updateProject(
  projectId: string,
  payload: { name?: string; url?: string; platform?: string }
): Promise<Project> {
  const { data } = await client.patch<Project>(`/projects/${projectId}`, payload);
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await client.delete(`/projects/${projectId}`);
}

export async function restartMonitoring(projectId: string): Promise<void> {
  await client.post(`/projects/${projectId}/restart`);
}

// ── Calendar ──────────────────────────────────────────────────────────────

export interface CalendarStatus {
  connected: boolean;
  upcoming_events: Array<{ id: string; title: string; start: string }>;
  settings: { minutes_before: number; keywords: string[]; warmup_enabled: boolean };
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  all_day: boolean;
  color_id?: string;
}

export async function fetchCalendarStatus(): Promise<CalendarStatus> {
  const { data } = await client.get<CalendarStatus>("/calendar/status");
  return data;
}

export async function fetchCalendarEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const { data } = await client.get<CalendarEvent[]>("/calendar/events", {
    params: { start, end },
  });
  return data;
}

export async function updateWarmupSettings(payload: {
  minutes_before?: number;
  keywords?: string[];
  warmup_enabled?: boolean;
}): Promise<void> {
  await client.patch("/calendar/settings", payload);
}
