import axios from "axios";
import { Ping, Project } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const client = axios.create({ baseURL: BASE, timeout: 10000 });

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

export async function deleteProject(projectId: string): Promise<void> {
  await client.delete(`/projects/${projectId}`);
}

export async function restartMonitoring(projectId: string): Promise<void> {
  await client.post(`/projects/${projectId}/restart`);
}
