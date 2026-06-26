const CONFIG: Record<string, { color: string; label: string }> = {
  healthy:    { color: "#10B981", label: "Healthy"    },
  cold_start: { color: "#F59E0B", label: "Cold start" },
  outage:     { color: "#EF4444", label: "Outage"     },
};

interface Props {
  classification: string | null;
  noPings?: boolean;
}

export default function StatusBadge({ classification, noPings }: Props) {
  const cfg = classification ? CONFIG[classification] : null;
  const color = cfg?.color ?? "#8B8FA8";
  const label = cfg?.label ?? (noPings ? "Waiting for first ping…" : "No data");

  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />
      {label}
    </span>
  );
}
