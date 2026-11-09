import { CalendarDays, Minus, Plus } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { addDays, shortDate } from "@/lib/termas/dates";

export function DateStrip({
  value,
  onChange,
  today,
  days = 14,
  max,
}: {
  value: string;
  onChange: (d: string) => void;
  today: string;
  days?: number;
  max?: string;
}) {
  const list = Array.from({ length: days }, (_, i) => addDays(today, i));
  const ref = useRef<HTMLDivElement>(null);
  const inList = list.includes(value);

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>("[data-selected=true]");
    el?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [value]);

  return (
    <div className="space-y-2">
      <div ref={ref} className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {list.map((d, i) => {
          const s = shortDate(d);
          const selected = d === value;
          return (
            <button
              key={d}
              type="button"
              data-selected={selected}
              onClick={() => onChange(d)}
              className={cn(
                "flex w-14 shrink-0 flex-col items-center rounded-xl border py-1.5 transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-sage",
              )}
            >
              <span className="text-[0.65rem] font-bold uppercase tracking-wide opacity-80">
                {i === 0 ? "hoy" : i === 1 ? "mañana" : s.weekday}
              </span>
              <span className="font-serif text-lg font-bold leading-tight">{s.day}</span>
              <span className="text-[0.65rem] capitalize opacity-80">{s.month}</span>
            </button>
          );
        })}
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="size-3.5" aria-hidden />
        <span>Otra fecha:</span>
        <input
          type="date"
          min={today}
          max={max}
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className={cn(
            "rounded-md border border-input bg-card px-2 py-1 text-xs text-foreground",
            !inList && "border-primary font-bold",
          )}
        />
      </label>
    </div>
  );
}

export function Counter({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-bold">{label}</p>
        {hint && <p className="text-xs leading-snug text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={`Restar ${label}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="grid size-9 place-items-center rounded-full border border-input bg-background disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-6 text-center font-serif text-lg font-bold" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Sumar ${label}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="grid size-9 place-items-center rounded-full border border-input bg-background disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
