import { Platform } from "../lib/types";

const LABELS: Record<Platform, string> = {
  render: "Render", railway: "Railway", fly: "Fly.io", other: "Other",
};

export default function PlatformPill({ platform }: { platform: Platform }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0"
      style={{ background: "#2D3154", color: "#8B8FA8" }}
    >
      {LABELS[platform] ?? platform}
    </span>
  );
}
