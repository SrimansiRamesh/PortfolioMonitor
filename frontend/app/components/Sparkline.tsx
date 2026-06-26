"use client";

import { ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import { Ping } from "../lib/types";

const STATUS_COLOR: Record<string, string> = {
  healthy:    "#10B981",
  cold_start: "#F59E0B",
  outage:     "#EF4444",
};

interface Props {
  pings: Ping[];
  classification: string | null;
}

export default function Sparkline({ pings, classification }: Props) {
  const data = [...pings]
    .reverse()
    .filter((p) => p.response_time_ms !== null)
    .map((p) => ({ ms: p.response_time_ms as number }));

  if (data.length < 2) return null;

  const stroke = (classification && STATUS_COLOR[classification]) || "#8B8FA8";

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="ms"
          stroke={stroke}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 4,
            background: "#1A1D2E",
            border: "1px solid #2D3154",
            color: "#F0F2FF",
          }}
          formatter={(v: any) => [`${v}ms`, ""]}
          labelFormatter={() => ""}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
