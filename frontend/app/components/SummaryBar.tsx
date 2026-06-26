import { ProjectWithPings } from "../lib/types";

export default function SummaryBar({ projects }: { projects: ProjectWithPings[] }) {
  const counts = { healthy: 0, cold_start: 0, outage: 0 };
  for (const p of projects) {
    const cls = p.pings[0]?.classification ?? null;
    if (cls === "healthy") counts.healthy++;
    else if (cls === "cold_start") counts.cold_start++;
    else if (cls === "outage") counts.outage++;
  }

  return (
    <div className="flex items-center gap-6 px-6 py-3 bg-surface border-b border-gray-200 text-sm">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-healthy inline-block" />
        <span className="font-medium text-primary">{counts.healthy}</span>
        <span className="text-muted">healthy</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-coldstart inline-block" />
        <span className="font-medium text-primary">{counts.cold_start}</span>
        <span className="text-muted">cold start</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-outage inline-block" />
        <span className="font-medium text-primary">{counts.outage}</span>
        <span className="text-muted">outage</span>
      </span>
    </div>
  );
}
