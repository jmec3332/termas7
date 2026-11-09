import { CalendarPlus, MessageCircle, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CLOSE_HOUR, DURATION_MIN, OPEN_HOUR, SEASON_LABEL, getPackage } from "@/lib/termas/config";
import { hh, longDate, money, rangeLabel } from "@/lib/termas/dates";
import { downloadICS, whatsappUrl } from "@/lib/termas/share";
import type { Reservation, ReservationStatus } from "@/lib/termas/types";
import { KindIcon } from "./icons";

const STATUS: Record<ReservationStatus, { label: string; className: string }> = {
  confirmada: { label: "Confirmada", className: "bg-secondary text-secondary-foreground" },
  cancelada: { label: "Cancelada", className: "bg-muted text-muted-foreground" },
  cancelada_tarde: { label: "Cancelada tarde", className: "bg-warning-soft text-destructive" },
  no_vino: { label: "No vino", className: "bg-warning-soft text-destructive" },
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const s = STATUS[status];
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", s.className)}>{s.label}</span>;
}

export function groupLabel(r: Pick<Reservation, "people" | "infants">) {
  const p = r.people === 1 ? "1 persona" : `${r.people} personas`;
  if (!r.infants) return p;
  return `${p} + ${r.infants} ${r.infants === 1 ? "menor" : "menores"} de 4`;
}

export function ReservationCard({ r, className }: { r: Reservation; className?: string }) {
  const pkg = getPackage(r.packageId);
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-card", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{pkg.name}</p>
          <p className="font-serif text-lg font-bold capitalize leading-snug">{longDate(r.date)}</p>
        </div>
        <StatusBadge status={r.status} />
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {r.turns.map((t) => (
          <li key={t.kind} className="flex items-center gap-2">
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full",
                t.kind === "tina" ? "bg-tina text-tina-foreground" : "bg-sauna text-sauna-foreground",
              )}
            >
              <KindIcon kind={t.kind} className="size-3.5" />
            </span>
            <span className="font-bold">{t.kind === "tina" ? "Tina" : "Sauna"}</span>
            <span>{rangeLabel(t.hour, DURATION_MIN[t.kind])}</span>
            <span className="text-muted-foreground">
              · {t.units} {t.kind === "tina" ? (t.units === 1 ? "tina" : "tinas") : t.units === 1 ? "sauna" : "saunas"}
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-sage text-primary-foreground">
            <KindIcon kind="piscina" className="size-3.5" />
          </span>
          <span className="font-bold">Piscinas</span>
          <span>
            libres de {hh(OPEN_HOUR)} a {hh(CLOSE_HOUR)}
          </span>
        </li>
        <li className="flex items-center gap-2 text-muted-foreground">
          <Users className="mx-1.5 size-4" aria-hidden />
          {groupLabel(r)}
        </li>
      </ul>
      <div className="mt-3 flex items-end justify-between border-t border-dashed border-border pt-3">
        <span className="text-xs text-muted-foreground">
          {money(r.pricePerPerson)} por persona
          <br />
          {SEASON_LABEL[r.season]}
        </span>
        <span className="font-serif text-xl font-black text-primary">{money(r.total)}</span>
      </div>
    </div>
  );
}

export function ShareActions({ r }: { r: Reservation }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button asChild variant="default" size="lg">
        <a href={whatsappUrl(r)} target="_blank" rel="noopener noreferrer">
          <MessageCircle /> WhatsApp
        </a>
      </Button>
      <Button variant="outline" size="lg" onClick={() => downloadICS(r)}>
        <CalendarPlus /> Calendario
      </Button>
    </div>
  );
}
