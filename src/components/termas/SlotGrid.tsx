import { cva } from "class-variance-authority";
import { Ban, Check, Clock, Wrench, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { CLOSE_HOUR, DURATION_MIN, OPEN_HOUR, SLOT_HOURS, TOTAL_UNITS } from "@/lib/termas/config";
import { hh } from "@/lib/termas/dates";
import { slotInfo, type SlotInfo } from "@/lib/termas/logic";
import type { OutOfService, ResourceKind, TermasState } from "@/lib/termas/types";
import { KindIcon } from "./icons";

const cell = cva(
  "relative flex min-h-[3.25rem] w-full flex-col justify-center rounded-lg border px-2.5 py-1.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      kind: { tina: "", sauna: "" },
      state: { open: "cursor-pointer active:scale-[0.98]", selected: "shadow-lift", blocked: "cursor-not-allowed border-transparent bg-blocked-stripes" },
    },
    compoundVariants: [
      { kind: "tina", state: "open", className: "border-tina/25 bg-tina-soft hover:border-tina" },
      { kind: "sauna", state: "open", className: "border-sauna/35 bg-sauna-soft hover:border-sauna" },
      { kind: "tina", state: "selected", className: "border-tina bg-tina text-tina-foreground" },
      { kind: "sauna", state: "selected", className: "border-sauna bg-sauna text-sauna-foreground" },
    ],
  },
);

function BlockIcon({ tone }: { tone: SlotInfo["tone"] }) {
  const cls = "size-3.5 shrink-0";
  if (tone === "down") return <Wrench className={cls} aria-hidden />;
  if (tone === "clash") return <Ban className={cls} aria-hidden />;
  if (tone === "past") return <Clock className={cls} aria-hidden />;
  return <XCircle className={cls} aria-hidden />;
}

function SlotCell({
  info,
  selected,
  onSelect,
}: {
  info: SlotInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  const state = selected ? "selected" : info.available ? "open" : "blocked";
  const labelTone =
    state !== "blocked"
      ? info.kind === "tina"
        ? selected
          ? ""
          : "text-tina"
        : selected
          ? ""
          : "text-sauna-ink"
      : info.tone === "past"
        ? "text-muted-foreground"
        : info.tone === "clash"
          ? "text-foreground/75"
          : "text-destructive";

  return (
    <button
      type="button"
      disabled={!info.available && !selected}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${info.kind === "tina" ? "Tina" : "Sauna"} ${hh(info.hour)}: ${info.label}`}
      className={cell({ kind: info.kind, state })}
    >
      <span className={cn("flex items-center gap-1.5 text-[0.8rem] font-bold leading-tight", labelTone)}>
        {state === "blocked" ? (
          <BlockIcon tone={info.tone} />
        ) : selected ? (
          <Check className="size-3.5 shrink-0" aria-hidden />
        ) : (
          <KindIcon kind={info.kind} className="size-3.5 shrink-0" />
        )}
        <span>{selected ? "Elegido" : info.label}</span>
      </span>
      {(selected || info.note) && (
        <span className={cn("mt-0.5 text-[0.7rem] leading-tight", selected ? "opacity-90" : "text-muted-foreground")}>
          {selected ? `${info.needed} ${info.kind === "tina" ? (info.needed === 1 ? "tina" : "tinas") : info.needed === 1 ? "sauna" : "saunas"} para tu grupo` : info.note}
        </span>
      )}
    </button>
  );
}

export function SlotGrid({
  state,
  date,
  people,
  now,
  kinds,
  selected,
  onSelect,
}: {
  state: TermasState;
  date: string;
  people: number;
  now: Date;
  kinds: ResourceKind[];
  selected: { tina?: number | undefined; sauna?: number | undefined };
  onSelect: (kind: ResourceKind, hour: number) => void;
}) {
  const cols = kinds.length === 2 ? "grid-cols-[3rem_1fr_1fr]" : "grid-cols-[3rem_1fr]";
  return (
    <div className="space-y-1.5">
      <div className={cn("grid gap-1.5 px-0.5 text-xs font-bold", cols)}>
        <span />
        {kinds.map((k) => (
          <span key={k} className={cn("flex items-center gap-1", k === "tina" ? "text-tina" : "text-sauna-ink")}>
            <KindIcon kind={k} className="size-3.5" />
            {k === "tina" ? "Tinas" : "Saunas"} · {DURATION_MIN[k]} min
          </span>
        ))}
      </div>
      {SLOT_HOURS.map((hour) => (
        <div key={hour} className={cn("grid items-stretch gap-1.5", cols)}>
          <span className="flex items-center font-serif text-sm font-bold text-foreground/80">{hh(hour)}</span>
          {kinds.map((kind) => {
            const otherKind = kind === "tina" ? "sauna" : "tina";
            const otherHour = kinds.includes(otherKind) ? selected[otherKind] : undefined;
            const info = slotInfo(state, {
              date,
              kind,
              hour,
              people,
              now,
              otherTurn: otherHour != null ? { kind: otherKind, hour: otherHour } : undefined,
            });
            return (
              <SlotCell
                key={kind}
                info={info}
                selected={selected[kind] === hour}
                onSelect={() => onSelect(kind, hour)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function formatUnits(o: Pick<OutOfService, "kind" | "units">): string {
  const sorted = [...o.units].sort((a, b) => a - b);
  if (sorted.length >= TOTAL_UNITS[o.kind]) return o.kind === "tina" ? "Todas las tinas" : "Todas las saunas";
  const word = o.kind === "tina" ? "Tina" : "Sauna";
  if (sorted.length === 1) return `${word} ${sorted[0]}`;
  const list = `${sorted.slice(0, -1).join(", ")} y ${sorted.at(-1)}`;
  return `${word}s ${list}`;
}

export function formatHours(o: Pick<OutOfService, "fromHour" | "toHour">): string {
  if (o.fromHour <= OPEN_HOUR && o.toHour >= CLOSE_HOUR) return "todo el día";
  return `de ${hh(o.fromHour)} a ${hh(o.toHour)}`;
}

export function DayNotices({
  state,
  date,
  kinds,
}: {
  state: TermasState;
  date: string;
  kinds: ResourceKind[];
}) {
  const items = state.outOfService
    .filter((o) => o.date === date && kinds.includes(o.kind))
    .sort((a, b) => a.fromHour - b.fromHour);
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5" aria-label="Avisos del día">
      {items.map((o) => (
        <li
          key={o.id}
          className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-warning-soft px-3 py-2 text-xs leading-snug"
        >
          <Wrench className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden />
          <span>
            <strong>{formatUnits(o)}</strong> fuera de servicio {formatHours(o)}: {o.reason}.
          </span>
        </li>
      ))}
    </ul>
  );
}
