"use client";

type Unit = "minutes" | "hours" | "days";

interface Props {
  valueMinutes: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
}

export function toMinutes(value: number, unit: Unit): number {
  if (unit === "hours") return value * 60;
  if (unit === "days") return value * 1440;
  return value;
}

export function fromMinutes(minutes: number): { value: number; unit: Unit } {
  if (minutes >= 1440 && minutes % 1440 === 0) return { value: minutes / 1440, unit: "days" };
  if (minutes >= 60 && minutes % 60 === 0) return { value: minutes / 60, unit: "hours" };
  return { value: minutes, unit: "minutes" };
}

const UNITS: { value: Unit; label: string }[] = [
  { value: "minutes", label: "min" },
  { value: "hours",   label: "hrs" },
  { value: "days",    label: "days" },
];

const inputStyle = {
  background: "#0F1117",
  border: "1px solid #2D3154",
  color: "#F0F2FF",
  outline: "none",
};

export default function IntervalInput({ valueMinutes, onChange, disabled }: Props) {
  const { value, unit } = fromMinutes(valueMinutes);

  function handleValue(raw: string) {
    const n = Math.max(1, parseInt(raw) || 1);
    onChange(toMinutes(n, unit));
  }

  function handleUnit(u: Unit) {
    onChange(toMinutes(value, u));
  }

  return (
    <div className="flex gap-2">
      <input
        type="number"
        min={1}
        value={value}
        disabled={disabled}
        onChange={(e) => handleValue(e.target.value)}
        className="w-20 rounded-lg px-3 py-2 text-sm"
        style={{ ...inputStyle, caretColor: "#6366F1", opacity: disabled ? 0.5 : 1 }}
      />
      <select
        value={unit}
        disabled={disabled}
        onChange={(e) => handleUnit(e.target.value as Unit)}
        className="rounded-lg px-3 py-2 text-sm"
        style={{ ...inputStyle, opacity: disabled ? 0.5 : 1 }}
      >
        {UNITS.map((u) => (
          <option key={u.value} value={u.value}>{u.label}</option>
        ))}
      </select>
    </div>
  );
}
