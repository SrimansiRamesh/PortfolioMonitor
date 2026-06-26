import { AlertCircle } from "lucide-react";

export default function ErrorBanner() {
  return (
    <div
      className="flex items-center gap-2 px-6 py-2.5 text-[13px]"
      style={{
        background: "rgba(239,68,68,0.08)",
        borderBottom: "1px solid rgba(239,68,68,0.2)",
        color: "#EF4444",
      }}
    >
      <AlertCircle size={14} />
      Cannot reach the monitor API — is the backend running?
    </div>
  );
}
