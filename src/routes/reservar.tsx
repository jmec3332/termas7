import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Counter, DateStrip } from "@/components/termas/controls";
import { KindChip, KindIcon } from "@/components/termas/icons";
import { PageLoading } from "@/components/termas/SiteHeader";
import { DayNotices, SlotGrid } from "@/components/termas/SlotGrid";
import { groupLabel } from "@/components/termas/ReservationCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import {
  BOOKING_HORIZON_DAYS,
  DURATION_MIN,
  MAX_PEOPLE,
  PACKAGES,
  SEASON_LABEL,
  SLOT_HOURS,
  getPackage,
} from "@/lib/termas/config";
import { addDays, longDate, money, rangeLabel, toISODate } from "@/lib/termas/dates";
import { quote, slotInfo, validateDraft } from "@/lib/termas/logic";
import { termas, useTermasState } from "@/lib/termas/store";
import type { BookingDraft, PackageId, ResourceKind, TermasState } from "@/lib/termas/types";

type Search = { paquete?: PackageId };

export const Route = createFileRoute("/reservar")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const id = search["paquete"] as PackageId;
    return PACKAGES.some((p) => p.id === id) ? { paquete: id } : {};
  },
  head: () => ({
    meta: [
      { title: "Reservar · Termas Punulaf" },
      { name: "description", content: "Elegí paquete, día y horario de tina o sauna con cupos en tiempo real." },
      { property: "og:title", content: "Reservar · Termas Punulaf" },
      { property: "og:description", content: "Elegí paquete, día y horario de tina o sauna con cupos en tiempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReservarPage,
});

function ReservarPage() {
  const state = useTermasState();
  const { paquete } = Route.useSearch();
  if (!state) return <PageLoading />;
  return <Wizard state={state} initialPackage={paquete} />;
}

type StepId = "paquete" | "grupo" | "horario" | "datos";
const STEP_LABEL: Record<StepId, string> = { paquete: "Paquete", grupo: "Día y grupo", horario: "Horario", datos: "Tus datos" };

function Wizard({ state, initialPackage }: { state: TermasState; initialPackage?: PackageId | undefined }) {
  const navigate = useNavigate();
  const now = useNow();
  const today = toISODate(now);
  const [packageId, setPackageId] = useState<PackageId>(initialPackage ?? "completo");
  const [step, setStep] = useState<StepId>(initialPackage ? "grupo" : "paquete");
  const [date, setDate] = useState(() => (now.getHours() >= SLOT_HOURS.at(-1)! ? addDays(today, 1) : today));
  const [people, setPeople] = useState(2);
  const [infants, setInfants] = useState(0);
  const [tinaHour, setTinaHour] = useState<number>();
  const [saunaHour, setSaunaHour] = useState<number>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pkg = getPackage(packageId);
  const kinds: ResourceKind[] = [
    ...(pkg.includes.tina ? (["tina"] as const) : []),
    ...(pkg.includes.sauna ? (["sauna"] as const) : []),
  ];
  const steps: StepId[] = kinds.length ? ["paquete", "grupo", "horario", "datos"] : ["paquete", "grupo", "datos"];
  const idx = steps.indexOf(step);
  const season = state.settings.season;
  const { pricePerPerson, total } = quote(packageId, season, people);

  const draft: BookingDraft = { packageId, date, people, infants, tinaHour, saunaHour, name, phone, email };

  function resetHours() {
    setTinaHour(undefined);
    setSaunaHour(undefined);
  }

  function selectSlot(kind: ResourceKind, hour: number) {
    setError(null);
    if (kind === "tina") {
      setTinaHour((h) => (h === hour ? undefined : hour));
      if (saunaHour === hour) setSaunaHour(undefined);
    } else {
      setSaunaHour((h) => (h === hour ? undefined : hour));
      if (tinaHour === hour) setTinaHour(undefined);
    }
  }

  function stepError(s: StepId): string | null {
    if (s === "grupo") {
      if (date < today) return "Esa fecha ya pasó.";
      if (kinds.length && !SLOT_HOURS.some((h) => kinds.every((k) => slotInfo(state, { date, kind: k, hour: h, people, now }).available)))
        return "Para este día y grupo no quedan horarios. Probá otra fecha o un grupo más chico.";
      return null;
    }
    if (s === "horario") {
      if (pkg.includes.tina && tinaHour == null) return "Elegí un horario de tina.";
      if (pkg.includes.sauna && saunaHour == null) return "Elegí un horario de sauna.";
      return null;
    }
    if (s === "datos") return validateDraft(state, draft, now);
    return null;
  }

  function next() {
    const err = stepError(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (step === "datos") {
      const res = termas.createReservation(draft);
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      navigate({ to: "/confirmacion/$codigo", params: { codigo: res.value.code } });
      return;
    }
    setStep(steps[idx + 1] ?? step);
  }

  function back() {
    setError(null);
    if (idx > 0) setStep(steps[idx - 1] ?? step);
  }

  const missing =
    step === "horario"
      ? [pkg.includes.tina && tinaHour == null && "tina", pkg.includes.sauna && saunaHour == null && "sauna"].filter(Boolean)
      : [];

  return (
    <div className="mx-auto max-w-xl px-4 pb-32 pt-3">
      {/* Pasos */}
      <ol className="mb-3 flex items-center gap-1.5" aria-label="Pasos de la reserva">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-1">
            <span className={cn("h-1 rounded-full", i <= idx ? "bg-primary" : "bg-border")} />
            <span className={cn("text-[0.65rem] font-bold uppercase tracking-wide", i === idx ? "text-primary" : "text-muted-foreground")}>
              {STEP_LABEL[s]}
            </span>
          </li>
        ))}
      </ol>

      <div className="mb-3 flex items-center gap-2">
        {idx > 0 && (
          <button type="button" onClick={back} aria-label="Volver" className="grid size-8 place-items-center rounded-full border border-border bg-card">
            <ArrowLeft className="size-4" />
          </button>
        )}
        <h1 className="text-xl font-bold">
          {step === "paquete" && "¿Qué te gustaría hacer?"}
          {step === "grupo" && "¿Cuándo vienen y cuántos son?"}
          {step === "horario" && (kinds.length === 2 ? "Elegí tina y sauna" : `Elegí tu ${kinds[0]}`)}
          {step === "datos" && "Últimos datos"}
        </h1>
      </div>

      <div key={step} className="animate-rise">
        {step === "paquete" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Precios por persona · {SEASON_LABEL[season]}</p>
            {PACKAGES.map((p) => {
              const selected = p.id === packageId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPackageId(p.id);
                    resetHours();
                  }}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border bg-card p-3.5 text-left transition-all",
                    selected ? "border-primary shadow-lift ring-1 ring-primary" : "border-border hover:border-sage",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border-2",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {selected && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif font-bold">{p.name}</span>
                    <span className="block text-xs leading-snug text-muted-foreground">{p.tagline}</span>
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {p.includes.tina && <KindChip kind="tina" label="Tina" />}
                      {p.includes.sauna && <KindChip kind="sauna" label="Sauna" />}
                      <KindChip kind="piscina" label="Piscinas" />
                    </span>
                  </span>
                  <span className="shrink-0 font-serif text-lg font-black text-primary">{money(p.prices[season])}</span>
                </button>
              );
            })}
          </div>
        )}

        {step === "grupo" && (
          <div className="space-y-3">
            <DateStrip
              value={date}
              today={today}
              max={addDays(today, BOOKING_HORIZON_DAYS)}
              onChange={(d) => {
                setDate(d);
                resetHours();
                setError(null);
              }}
            />
            <Counter
              label="Personas"
              hint="Desde 4 años. Cada una paga y ocupa su tina."
              value={people}
              min={1}
              max={MAX_PEOPLE}
              onChange={(n) => {
                setPeople(n);
                setInfants((i) => Math.min(i, n));
                resetHours();
                setError(null);
              }}
            />
            <Counter
              label="Menores de 4 años"
              hint="No pagan y comparten tina con un adulto."
              value={infants}
              min={0}
              max={people}
              onChange={setInfants}
            />
            {kinds.includes("sauna") && (
              <p className="flex items-start gap-2 rounded-lg bg-sauna-soft px-3 py-2 text-xs leading-snug">
                <Info className="mt-0.5 size-3.5 shrink-0 text-sauna-ink" aria-hidden />
                {people <= 4
                  ? "Grupos de 1 a 4 personas usan una sauna."
                  : `Con ${people} personas necesitan dos saunas en el mismo horario.`}
              </p>
            )}
          </div>
        )}

        {step === "horario" && (
          <div className="space-y-2.5">
            <p className="text-xs capitalize text-muted-foreground">
              {longDate(date)} · {groupLabel({ people, infants })}
            </p>
            <DayNotices state={state} date={date} kinds={kinds} />
            {kinds.length === 2 && (
              <p className="text-xs text-muted-foreground">Tina y sauna tienen que ser en horarios distintos.</p>
            )}
            <SlotGrid
              state={state}
              date={date}
              people={people}
              now={now}
              kinds={kinds}
              selected={{ tina: tinaHour, sauna: saunaHour }}
              onSelect={selectSlot}
            />
          </div>
        )}

        {step === "datos" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-card p-3.5 text-sm shadow-card">
              <p className="font-serif font-bold">{pkg.name}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {longDate(date)} · {groupLabel({ people, infants })}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tinaHour != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-tina px-2.5 py-1 text-xs font-bold text-tina-foreground">
                    <KindIcon kind="tina" className="size-3.5" /> {rangeLabel(tinaHour, DURATION_MIN.tina)}
                  </span>
                )}
                {saunaHour != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sauna px-2.5 py-1 text-xs font-bold text-sauna-foreground">
                    <KindIcon kind="sauna" className="size-3.5" /> {rangeLabel(saunaHour, DURATION_MIN.sauna)}
                  </span>
                )}
                <KindChip kind="piscina" label="Piscinas todo el día" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre y apellido</Label>
              <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Camila Fuentes" className="h-11 bg-card" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Celular</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+56 9 1234 5678"
                className="h-11 bg-card"
              />
              <p className="text-xs text-muted-foreground">Lo vas a necesitar junto al código para ver o cancelar tu visita.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">
                Correo <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.cl" className="h-11 bg-card" />
            </div>
            <p className="text-xs leading-snug text-muted-foreground">
              Podés cancelar sin costo hasta 24 h antes de tu primer turno. Después, los turnos quedan tomados.
            </p>
          </div>
        )}
      </div>

      {/* Barra inferior */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-xl px-4 py-3">
          {error && (
            <p role="alert" className="mb-2 rounded-md bg-warning-soft px-3 py-1.5 text-xs font-bold text-destructive">
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg font-black leading-tight text-primary">{money(total)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {people} × {money(pricePerPerson)} · {pkg.name}
              </p>
            </div>
            <Button size="lg" onClick={next} className="shrink-0">
              {step === "datos"
                ? "Confirmar reserva"
                : missing.length
                  ? `Falta ${missing.join(" y ")}`
                  : "Seguir"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
