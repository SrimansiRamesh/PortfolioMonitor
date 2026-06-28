"use client";

import { Plus } from "lucide-react";

function Mascot() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Glow */}
      <ellipse cx="60" cy="108" rx="28" ry="6" fill="#6366F1" opacity="0.18" />

      {/* Body */}
      <rect x="28" y="44" width="64" height="56" rx="16" fill="#1A1D2E" stroke="#2D3154" strokeWidth="1.5" />

      {/* Screen bezel */}
      <rect x="36" y="52" width="48" height="32" rx="6" fill="#0F1117" stroke="#2D3154" strokeWidth="1" />

      {/* Screen content — three idle lines */}
      <rect x="42" y="60" width="20" height="3" rx="1.5" fill="#6366F1" opacity="0.5" />
      <rect x="42" y="67" width="32" height="3" rx="1.5" fill="#6366F1" opacity="0.3" />
      <rect x="42" y="74" width="14" height="3" rx="1.5" fill="#6366F1" opacity="0.2" />

      {/* Blinking cursor */}
      <rect x="58" y="74" width="2" height="3" rx="1" fill="#6366F1">
        <animate attributeName="opacity" values="1;0;1" dur="1.2s" repeatCount="indefinite" />
      </rect>

      {/* Left ear / antenna */}
      <rect x="44" y="30" width="4" height="16" rx="2" fill="#2D3154" />
      <circle cx="46" cy="28" r="5" fill="#6366F1" opacity="0.85">
        <animate attributeName="r" values="5;6;5" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.85;1;0.85" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Right ear / antenna */}
      <rect x="72" y="30" width="4" height="16" rx="2" fill="#2D3154" />
      <circle cx="74" cy="28" r="5" fill="#10B981" opacity="0.75">
        <animate attributeName="r" values="5;6;5" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.75;1;0.75" dur="2.4s" repeatCount="indefinite" />
      </circle>

      {/* Eyes */}
      <ellipse cx="50" cy="94" rx="5" ry="4" fill="#6366F1" opacity="0.9" />
      <ellipse cx="70" cy="94" rx="5" ry="4" fill="#6366F1" opacity="0.9" />
      <circle cx="51" cy="93" r="1.5" fill="#F0F2FF" />
      <circle cx="71" cy="93" r="1.5" fill="#F0F2FF" />

      {/* Smile */}
      <path d="M52 100 Q60 105 68 100" stroke="#8B8FA8" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Feet */}
      <rect x="40" y="98" width="14" height="8" rx="4" fill="#2D3154" />
      <rect x="66" y="98" width="14" height="8" rx="4" fill="#2D3154" />
    </svg>
  );
}

export default function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <Mascot />
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
