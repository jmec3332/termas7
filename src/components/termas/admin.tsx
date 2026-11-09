import { AlertTriangle, Lock, Plus, Trash2, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ADMIN_PASSWORD,
  CANCEL_WINDOW_HOURS,
  CLOSE_HOUR,
  PACKAGES,
  SEASON_LABEL,
  SLOT_HOURS,
  TOTAL_UNITS,
  getPackage,
} from "@/lib/termas/config";
import { hh, longDate, money } from "@/lib/termas/dates";
import { dayOccupancy, hoursUntilVisit, visitStart } from "@/lib/termas/logic";
import { termas } from "@/lib/termas/store";
import type { Reservation, ResourceKind, Season, TermasState } from "@/lib/termas/types";
import { KindIcon } from "./icons";
import { StatusBadge, groupLabel } from "./ReservationCard";
import { DayNotices, formatHours, formatUnits } from "./SlotGrid";

/* ------------------------------------------------------------------ */
/* Clave de acceso                                                     */
/* ------------------------------------------------------------------ */

export function AdminGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value === ADMIN_PASSWORD) onUnlock();
          else setError(true);
        }}
        className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card"
      >
        <span className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground">
          <Lock className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-bold">Panel del recinto</h1>
          <p className="text-sm text-muted-foreground">Ingresá la clave del equipo para seguir.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-pass">Clave</Label>
          <Input
            id="admin-pass"
            type="password"
            autoComplete="current-password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            className="h-11"
            autoFocus
          />
          {error && <p className="text-xs font-bold text-destructive">Clave incorrecta. Probá de nuevo.</p>}
        </div>
        <Button type="submit" size="lg" className="w-full">
          Entrar
        </Button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ocupación del día                                                   */
/* ------------------------------------------------------------------ */

function Bar({ kind, occupied, capacity }: { kind: ResourceKind; occupied: number; capacity: number }) {
  const total = TOTAL_UNITS[kind];
  const down = total - capacity;
  const over = Math.max(0, occupied - capacity);
  const pctOcc = (Math.min(occupied, capacity) / total) * 100;
  const pctDown = (down / total) * 100;
  return (
    <div className="min-w-0">
      <div className="mb-0.5 flex items-center justify-between gap-1 text-[0.7rem]">
        <span className={cn("flex items-center gap-1 font-bold", kind === "tina" ? "text-tina" : "text-sauna-ink")}>
          <KindIcon kind={kind} className="size-3" />
          {occupied}/{capacity}
        </span>
        {down > 0 && (
          <span className="flex items-center gap-0.5 text-destructive">
            <Wrench className="size-3" aria-hidden />
            {down}
          </span>
        )}
      </div>
      <div className="relative flex h-2 overflow-hidden rounded-full bg-muted">
        <span className={cn("h-full", kind === "tina" ? "bg-tina" : "bg-sauna")} style={{ width: `${pctOcc}%` }} />
        <span className="ml-auto h-full bg-blocked-stripes" style={{ width: `${pctDown}%` }} />
      </div>
      {over > 0 && <p className="mt-0.5 text-[0.65rem] font-bold text-destructive">Reubicar {over}</p>}
    </div>
  );
}

export function OccupancyView({ state, date, now }: { state: TermasState; date: string; now: Date }) {
  const rows = dayOccupancy(state, date);
  const list = state.reservations
    .filter((r) => r.date === date)
    .sort((a, b) => visitStart(a).getTime() - visitStart(b).getTime());
  const active = list.filter((r) => r.status !== "cancelada");
  const peopleCount = active.reduce((s, r) => s + r.people + r.infants, 0);
  const income = active.reduce((s, r) => s + r.total, 0);
  const overbooked = rows.filter((r) => r.tina.overbooked || r.sauna.overbooked);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Reservas", value: String(active.length) },
          { label: "Personas", value: String(peopleCount) },
          { label: "Ingresos", value: money(income) },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card px-2 py-2">
            <p className="font-serif text-base font-black text-primary sm:text-lg">{k.value}</p>
            <p className="text-[0.7rem] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <DayNotices state={state} date={date} kinds={["tina", "sauna"]} />

      {overbooked.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-warning-soft px-3 py-2 text-xs leading-snug">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden />
          Hay reservas sin unidad por recursos fuera de servicio ({overbooked.map((r) => hh(r.hour)).join(", ")}). La reubicación la coordina el recinto.
        </p>
      )}

      <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
        <div className="mb-2 grid grid-cols-[2.75rem_1fr_1fr] gap-3 text-[0.7rem] font-bold text-muted-foreground">
          <span>Hora</span>
          <span>Tinas ocupadas</span>
          <span>Saunas ocupadas</span>
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.hour} className="grid grid-cols-[2.75rem_1fr_1fr] items-center gap-3">
              <span className="font-serif text-sm font-bold">{hh(r.hour)}</span>
              <Bar kind="tina" occupied={r.tina.occupied} capacity={r.tina.capacity} />
              <Bar kind="sauna" occupied={r.sauna.occupied} capacity={r.sauna.capacity} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-base font-bold">Reservas del día ({list.length})</h3>
        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
            Todavía no hay reservas para este día.
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((r) => (
              <ReservationRow key={r.code} r={r} now={now} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ReservationRow({ r, now }: { r: Reservation; now: Date }) {
  const started = visitStart(r) <= now;
  const freesOnCancel = hoursUntilVisit(r, now) > CANCEL_WINDOW_HOURS;
  return (
    <li className={cn("rounded-xl border border-border bg-card p-3", r.status === "cancelada" && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{r.name}</p>
          <p className="text-xs text-muted-foreground">
            {r.code} · {r.phone}
          </p>
        </div>
        <StatusBadge status={r.status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-bold">{getPackage(r.packageId).name}</span>
        {r.turns.map((t) => (
          <span
            key={t.kind}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold",
              t.kind === "tina" ? "bg-tina-soft text-tina" : "bg-sauna-soft text-sauna-ink",
            )}
          >
            <KindIcon kind={t.kind} className="size-3" />
            {hh(t.hour)} ×{t.units}
          </span>
        ))}
        <span className="text-muted-foreground">· {groupLabel(r)}</span>
        <span className="ml-auto font-bold">{money(r.total)}</span>
      </div>
      {r.status === "confirmada" && (
        <div className="mt-2 flex justify-end gap-1.5">
          {started && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const res = termas.markNoShow(r.code);
                if (res.ok) toast("Marcada como No vino. El turno sigue ocupado.");
                else toast.error(res.error);
              }}
            >
              No vino
            </Button>
          )}
          {!started && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-warning-soft hover:text-destructive">
                  Cancelar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cancelar la reserva {r.code}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {freesOnCancel
                      ? "Faltan más de 24 h: se liberan todos los turnos de esta reserva."
                      : "Faltan menos de 24 h: queda registrada como cancelación tardía y los turnos NO se liberan."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Volver</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      const res = termas.cancelByAdmin(r.code);
                      if (res.ok) toast.success(freesOnCancel ? "Cancelada. Turnos liberados." : "Cancelación tardía registrada.");
                      else toast.error(res.error);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Cancelar reserva
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Fuera de servicio                                                   */
/* ------------------------------------------------------------------ */

export function OutOfServiceView({ state, date, today }: { state: TermasState; date: string; today: string }) {
  const [kind, setKind] = useState<ResourceKind>("tina");
  const [units, setUnits] = useState<number[]>([]);
  const [fromHour, setFromHour] = useState(SLOT_HOURS[0]);
  const [toHour, setToHour] = useState(CLOSE_HOUR);
  const [reason, setReason] = useState("");

  const total = TOTAL_UNITS[kind];
  const all = units.length === total;

  function toggle(u: number) {
    setUnits((list) => (list.includes(u) ? list.filter((x) => x !== u) : [...list, u]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = termas.addOutOfService({ date, kind, units, fromHour, toHour, reason });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`${formatUnits({ kind, units })} fuera de servicio el ${longDate(date)}.`);
    setUnits([]);
    setReason("");
  }

  const upcoming = state.outOfService
    .filter((o) => o.date >= today)
    .sort((a, b) => (a.date === b.date ? a.fromHour - b.fromHour : a.date.localeCompare(b.date)));

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <p className="text-sm">
          Marcar fuera de servicio para el <strong className="capitalize">{longDate(date)}</strong>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(["tina", "sauna"] as const).map((k) => (
            <Button
              key={k}
              type="button"
              variant={kind === k ? k : "outline"}
              onClick={() => {
                setKind(k);
                setUnits([]);
              }}
            >
              <KindIcon kind={k} /> {k === "tina" ? "Tinas" : "Saunas"}
            </Button>
          ))}
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label>Unidades</Label>
            <button
              type="button"
              className="text-xs font-bold text-primary"
              onClick={() => setUnits(all ? [] : Array.from({ length: total }, (_, i) => i + 1))}
            >
              {all ? "Ninguna" : "Todas"}
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: total }, (_, i) => i + 1).map((u) => {
              const on = units.includes(u);
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() => toggle(u)}
                  aria-pressed={on}
                  className={cn(
                    "h-9 rounded-lg border text-sm font-bold transition-colors",
                    on ? "border-destructive bg-destructive text-destructive-foreground" : "border-input bg-background",
                  )}
                >
                  {u}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-sm font-bold">
            Desde
            <select value={fromHour} onChange={(e) => setFromHour(Number(e.target.value))} className="h-10 w-full rounded-md border border-input bg-background px-2 font-normal">
              {SLOT_HOURS.map((h) => (
                <option key={h} value={h}>
                  {hh(h)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-bold">
            Hasta
            <select value={toHour} onChange={(e) => setToHour(Number(e.target.value))} className="h-10 w-full rounded-md border border-input bg-background px-2 font-normal">
              {[...SLOT_HOURS.slice(1), CLOSE_HOUR].map((h) => (
                <option key={h} value={h}>
                  {h === CLOSE_HOUR ? "Cierre (18:00)" : hh(h)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="space-y-1">
          <Label htmlFor="reason">Motivo (se muestra en la grilla)</Label>
          <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Mantención de estufa" />
        </div>
        <Button type="submit" className="w-full">
          <Plus /> Marcar fuera de servicio
        </Button>
        <p className="text-[0.7rem] leading-snug text-muted-foreground">
          El cupo del día baja enseguida. Si hay reservas tomadas, no se mueven solas: la reubicación la coordina el recinto.
        </p>
      </form>

      <div>
        <h3 className="mb-2 text-base font-bold">Próximos cortes</h3>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">No hay recursos fuera de servicio.</p>
        ) : (
          <ul className="space-y-1.5">
            {upcoming.map((o) => (
              <li key={o.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full",
                    o.kind === "tina" ? "bg-tina-soft text-tina" : "bg-sauna-soft text-sauna-ink",
                  )}
                >
                  <KindIcon kind={o.kind} />
                </span>
                <div className="min-w-0 flex-1 text-xs leading-snug">
                  <p className="font-bold">
                    {formatUnits(o)} · <span className="capitalize">{longDate(o.date)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    {formatHours(o)} · {o.reason}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Volver a habilitar"
                  onClick={() => {
                    termas.removeOutOfService(o.id);
                    toast.success("Recurso habilitado de nuevo.");
                  }}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Temporada                                                           */
/* ------------------------------------------------------------------ */

export function SeasonView({ state }: { state: TermasState }) {
  const season = state.settings.season;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(["baja", "alta"] as Season[]).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={season === s}
            onClick={() => {
              if (s === season) return;
              termas.setSeason(s);
              toast.success(`${SEASON_LABEL[s]} activa. Solo afecta reservas nuevas.`);
            }}
            className={cn(
              "rounded-2xl border p-4 text-left transition-all",
              season === s ? "border-primary bg-primary text-primary-foreground shadow-lift" : "border-border bg-card hover:border-sage",
            )}
          >
            <p className="text-xs font-bold uppercase tracking-wider opacity-80">{season === s ? "Activa" : "Activar"}</p>
            <p className="font-serif text-lg font-bold">{SEASON_LABEL[s]}</p>
          </button>
        ))}
      </div>
      <p className="rounded-lg bg-secondary px-3 py-2 text-xs leading-snug text-secondary-foreground">
        El cambio aplica solo a reservas nuevas. Las que ya están hechas mantienen el precio con el que se reservaron.
      </p>
      <table className="w-full overflow-hidden rounded-2xl border border-border bg-card text-sm shadow-card">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-bold">Paquete (por persona)</th>
            <th className="px-3 py-2 text-right font-bold">Baja</th>
            <th className="px-3 py-2 text-right font-bold">Alta</th>
          </tr>
        </thead>
        <tbody>
          {PACKAGES.map((p) => (
            <tr key={p.id} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 font-bold">{p.name}</td>
              {(["baja", "alta"] as const).map((s) => (
                <td key={s} className={cn("px-3 py-2 text-right", season === s ? "font-black text-primary" : "text-muted-foreground")}>
                  {money(p.prices[s])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
