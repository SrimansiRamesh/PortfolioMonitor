"use client";

import { Plus } from "lucide-react";

export default function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="text-center">
        <p className="text-[15px] font-medium" style={{ color: "#F0F2FF" }}>No projects yet</p>
        <p className="text-[13px] mt-1" style={{ color: "#8B8FA8" }}>Add one to start monitoring.</p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
        style={{ background: "#6366F1" }}
      >
        <Plus size={15} />
        Add project
      </button>
    </div>
  );
}
