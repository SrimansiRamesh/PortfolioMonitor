export type Platform = "render" | "railway" | "fly" | "other";

export interface Project {
  id: string;
  name: string;
  url: string;
  platform: Platform;
  baseline_response_ms: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Ping {
  id: string;
  project_id: number;
  status_code: number | null;
  response_time_ms: number | null;
  classification: string | null;
  diagnosis: string | null;
  pinged_at: string;
}

export interface ProjectWithPings extends Project {
  pings: Ping[];
}
