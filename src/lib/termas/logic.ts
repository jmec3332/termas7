import {
  CANCEL_WINDOW_HOURS,
  CLOSE_HOUR,
  DURATION_MIN,
  KIND_LABEL,
  MAX_PEOPLE,
  OPEN_HOUR,
  SLOT_HOURS,
  TOTAL_UNITS,
  getPackage,
} from "./config";
import { atTime, hh } from "./dates";
import type {
  BookingDraft,
  OutOfService,
  PackageId,
  Reservation,
  ResourceKind,
  Season,
  TermasState,
  Turn,
} from "./types";

/* ------------------------------------------------------------------ */
/* Reglas básicas                                                      */
/* ------------------------------------------------------------------ */

/** Tinas: una por persona. Saunas: 1-4 personas = 1 sauna, 5-6 = 2 saunas. */
export function unitsNeeded(kind: ResourceKind, people: number): number {
  if (kind === "tina") return people;
  return people <= 4 ? 1 : 2;
}

export function holdsResources(r: Reservation): boolean {
  return r.status !== "cancelada";
}

export function priceFor(packageId: PackageId, season: Season): number {
  return getPackage(packageId).prices[season];
}

export function quote(packageId: PackageId, season: Season, people: number) {
  const pricePerPerson = priceFor(packageId, season);
  return { pricePerPerson, total: pricePerPerson * people };
}

export function turnsOverlap(a: Pick<Turn, "kind" | "hour">, b: Pick<Turn, "kind" | "hour">): boolean {
  const aStart = a.hour * 60;
  const aEnd = aStart + DURATION_MIN[a.kind];
  const bStart = b.hour * 60;
  const bEnd = bStart + DURATION_MIN[b.kind];
  return aStart < bEnd && bStart < aEnd;
}

/* ------------------------------------------------------------------ */
/* Cupos                                                               */
/* ------------------------------------------------------------------ */

export function outOfServiceAt(
  state: TermasState,
  date: string,
  kind: ResourceKind,
  hour: number,
): OutOfService[] {
  return state.outOfService.filter(
    (o) => o.date === date && o.kind === kind && hour >= o.fromHour && hour < o.toHour,
  );
}

export function capacityAt(state: TermasState, date: string, kind: ResourceKind, hour: number): number {
  const down = new Set<number>();
  for (const o of outOfServiceAt(state, date, kind, hour)) o.units.forEach((u) => down.add(u));
  return Math.max(0, TOTAL_UNITS[kind] - down.size);
}

export function occupiedAt(
  state: TermasState,
  date: string,
  kind: ResourceKind,
  hour: number,
  excludeCode?: string,
): number {
  let total = 0;
  for (const r of state.reservations) {
    if (r.date !== date || !holdsResources(r) || r.code === excludeCode) continue;
    for (const t of r.turns) if (t.kind === kind && t.hour === hour) total += t.units;
  }
  return total;
}

export function freeAt(state: TermasState, date: string, kind: ResourceKind, hour: number): number {
  return Math.max(0, capacityAt(state, date, kind, hour) - occupiedAt(state, date, kind, hour));
}

export type SlotTone = "ok" | "low" | "full" | "down" | "past" | "short" | "clash";

export interface SlotInfo {
  kind: ResourceKind;
  hour: number;
  capacity: number;
  occupied: number;
  free: number;
  needed: number;
  available: boolean;
  tone: SlotTone;
  /** Leyenda siempre visible en la grilla. */
  label: string;
  /** Aviso secundario (p. ej. unidades fuera de servicio). */
  note?: string;
}

export function slotInfo(
  state: TermasState,
  opts: {
    date: string;
    kind: ResourceKind;
    hour: number;
    people: number;
    now: Date;
    /** Otro turno ya elegido en Día Completo, para bloquear solapes. */
    otherTurn?: Pick<Turn, "kind" | "hour">;
  },
): SlotInfo {
  const { date, kind, hour, people, now, otherTurn } = opts;
  const capacity = capacityAt(state, date, kind, hour);
  const occupied = occupiedAt(state, date, kind, hour);
  const free = Math.max(0, capacity - occupied);
  const needed = unitsNeeded(kind, people);
  const oos = outOfServiceAt(state, date, kind, hour);
  const downUnits = TOTAL_UNITS[kind] - capacity;
  const L = KIND_LABEL[kind];
  const base = { kind, hour, capacity, occupied, free, needed };
  const note = downUnits > 0 && capacity > 0 ? `${downUnits} fuera de servicio` : undefined;

  if (atTime(date, hour) <= now) {
    return { ...base, available: false, tone: "past", label: "Horario pasado" };
  }
  if (capacity === 0) {
    const reason = oos[0]?.reason ?? "Fuera de servicio";
    return { ...base, available: false, tone: "down", label: reason };
  }
  if (free === 0) {
    return { ...base, available: false, tone: "full", label: kind === "tina" ? "Sin tinas" : "Sin saunas", note };
  }
  if (free < needed) {
    const quedan = free === 1 ? `Queda 1 ${L.one}` : `Quedan ${free} ${L.many}`;
    return {
      ...base,
      available: false,
      tone: "short",
      label: `${quedan}, necesitás ${needed}`,
      note,
    };
  }
  if (otherTurn && otherTurn.kind !== kind && turnsOverlap({ kind, hour }, otherTurn)) {
    return {
      ...base,
      available: false,
      tone: "clash",
      label: `Se cruza con tu ${KIND_LABEL[otherTurn.kind].one} de ${hh(otherTurn.hour)}`,
      note,
    };
  }
  const low = free <= Math.max(needed, kind === "tina" ? 3 : 1);
  return {
    ...base,
    available: true,
    tone: low ? "low" : "ok",
    label: free === 1 ? `Queda 1 ${L.one}` : `${free} ${L.many} libres`,
    note,
  };
}

/* ------------------------------------------------------------------ */
/* Reservas                                                            */
/* ------------------------------------------------------------------ */

export function draftTurns(draft: Pick<BookingDraft, "packageId" | "people" | "tinaHour" | "saunaHour">): Turn[] {
  const pkg = getPackage(draft.packageId);
  const turns: Turn[] = [];
  if (pkg.includes.tina && draft.tinaHour != null)
    turns.push({ kind: "tina", hour: draft.tinaHour, units: unitsNeeded("tina", draft.people) });
  if (pkg.includes.sauna && draft.saunaHour != null)
    turns.push({ kind: "sauna", hour: draft.saunaHour, units: unitsNeeded("sauna", draft.people) });
  return turns;
}

export function validateDraft(state: TermasState, draft: BookingDraft, now: Date): string | null {
  const pkg = getPackage(draft.packageId);
  if (!Number.isInteger(draft.people) || draft.people < 1 || draft.people > MAX_PEOPLE)
    return `El grupo tiene que ser de 1 a ${MAX_PEOPLE} personas.`;
  if (draft.infants < 0 || draft.infants > draft.people)
    return "Cada menor de 4 años tiene que ir con un adulto en su tina.";
  if (atTime(draft.date, CLOSE_HOUR) <= now) return "Esa fecha ya pasó.";
  if (pkg.includes.tina && draft.tinaHour == null) return "Elegí un horario de tina.";
  if (pkg.includes.sauna && draft.saunaHour == null) return "Elegí un horario de sauna.";

  const tina = pkg.includes.tina ? { kind: "tina" as const, hour: draft.tinaHour! } : undefined;
  const sauna = pkg.includes.sauna ? { kind: "sauna" as const, hour: draft.saunaHour! } : undefined;
  for (const t of [tina, sauna]) {
    if (!t) continue;
    if (!SLOT_HOURS.includes(t.hour)) return "Ese horario no existe.";
    const other = t.kind === "tina" ? sauna : tina;
    const info = slotInfo(state, { date: draft.date, kind: t.kind, hour: t.hour, people: draft.people, now, otherTurn: other });
    if (!info.available) return `${hh(t.hour)} ${KIND_LABEL[t.kind].one}: ${info.label}.`;
  }
  if (!draft.name.trim()) return "Contanos tu nombre.";
  if (normalizePhone(draft.phone).length < 8) return "Revisá el celular: necesitamos al menos 8 dígitos.";
  return null;
}

export function buildReservation(
  state: TermasState,
  draft: BookingDraft,
  code: string,
  now: Date,
): Reservation {
  const season = state.settings.season;
  const { pricePerPerson, total } = quote(draft.packageId, season, draft.people);
  return {
    code,
    packageId: draft.packageId,
    date: draft.date,
    people: draft.people,
    infants: draft.infants,
    name: draft.name.trim(),
    phone: draft.phone.trim(),
    email: draft.email?.trim() || undefined,
    turns: draftTurns(draft),
    season,
    pricePerPerson,
    total,
    status: "confirmada",
    createdAt: now.toISOString(),
  };
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function createReservation(
  state: TermasState,
  draft: BookingDraft,
  code: string,
  now: Date,
): Result<{ state: TermasState; reservation: Reservation }> {
  const error = validateDraft(state, draft, now);
  if (error) return { ok: false, error };
  const reservation = buildReservation(state, draft, code, now);
  return { ok: true, value: { state: { ...state, reservations: [...state.reservations, reservation] }, reservation } };
}

/** Momento en que empieza la visita: el primer turno, o la apertura si es solo piscinas. */
export function visitStart(r: Pick<Reservation, "date" | "turns">): Date {
  const first = r.turns.length ? Math.min(...r.turns.map((t) => t.hour)) : OPEN_HOUR;
  return atTime(r.date, first);
}

export function hoursUntilVisit(r: Pick<Reservation, "date" | "turns">, now: Date): number {
  return (visitStart(r).getTime() - now.getTime()) / 3_600_000;
}

export function canCustomerCancel(r: Reservation, now: Date): { ok: boolean; reason?: string } {
  if (r.status !== "confirmada") return { ok: false, reason: "Esta reserva ya no está activa." };
  const h = hoursUntilVisit(r, now);
  if (h <= 0) return { ok: false, reason: "El horario ya pasó." };
  if (h <= CANCEL_WINDOW_HOURS)
    return {
      ok: false,
      reason: "Faltan menos de 24 h para tu visita: ya no se puede cancelar y los turnos quedan tomados.",
    };
  return { ok: true };
}

function updateReservation(state: TermasState, code: string, patch: Partial<Reservation>): TermasState {
  return {
    ...state,
    reservations: state.reservations.map((r) => (r.code === code ? { ...r, ...patch } : r)),
  };
}

/** Cancelación del cliente: solo con más de 24 h, y libera todos los turnos. */
export function cancelByCustomer(state: TermasState, code: string, now: Date): Result<TermasState> {
  const r = state.reservations.find((x) => x.code === code);
  if (!r) return { ok: false, error: "No encontramos esa reserva." };
  const check = canCustomerCancel(r, now);
  if (!check.ok) return { ok: false, error: check.reason! };
  return { ok: true, value: updateReservation(state, code, { status: "cancelada", updatedAt: now.toISOString() }) };
}

/**
 * Cancelación desde el panel. Con más de 24 h libera los turnos (cancelada);
 * con menos de 24 h queda registrada como tardía y los turnos siguen tomados.
 */
export function cancelByAdmin(state: TermasState, code: string, now: Date): Result<TermasState> {
  const r = state.reservations.find((x) => x.code === code);
  if (!r) return { ok: false, error: "No encontramos esa reserva." };
  if (r.status !== "confirmada") return { ok: false, error: "La reserva ya no está activa." };
  const status = hoursUntilVisit(r, now) > CANCEL_WINDOW_HOURS ? "cancelada" : "cancelada_tarde";
  return { ok: true, value: updateReservation(state, code, { status, updatedAt: now.toISOString() }) };
}

/** "No vino": solo cuando el horario ya pasó, y el turno NO se libera. */
export function markNoShow(state: TermasState, code: string, now: Date): Result<TermasState> {
  const r = state.reservations.find((x) => x.code === code);
  if (!r) return { ok: false, error: "No encontramos esa reserva." };
  if (r.status !== "confirmada") return { ok: false, error: "La reserva ya no está activa." };
  if (visitStart(r) > now) return { ok: false, error: "Todavía no llegó el horario de esta reserva." };
  return { ok: true, value: updateReservation(state, code, { status: "no_vino", updatedAt: now.toISOString() }) };
}

export function setSeason(state: TermasState, season: Season): TermasState {
  return { ...state, settings: { ...state.settings, season } };
}

export function addOutOfService(state: TermasState, entry: OutOfService): Result<TermasState> {
  if (!entry.units.length) return { ok: false, error: "Elegí al menos una unidad." };
  if (entry.fromHour >= entry.toHour) return { ok: false, error: "El horario de término tiene que ser después del inicio." };
  if (!entry.reason.trim()) return { ok: false, error: "Escribí el motivo: se muestra en la grilla." };
  return { ok: true, value: { ...state, outOfService: [...state.outOfService, { ...entry, reason: entry.reason.trim() }] } };
}

export function removeOutOfService(state: TermasState, id: string): TermasState {
  return { ...state, outOfService: state.outOfService.filter((o) => o.id !== id) };
}

/* ------------------------------------------------------------------ */
/* Búsqueda y ocupación                                               */
/* ------------------------------------------------------------------ */

export function normalizePhone(p: string): string {
  return p.replace(/\D/g, "");
}

export function phonesMatch(a: string, b: string): boolean {
  const x = normalizePhone(a);
  const y = normalizePhone(b);
  if (x.length < 8 || y.length < 8) return false;
  return x.slice(-8) === y.slice(-8);
}

export function findReservation(state: TermasState, code: string, phone: string): Reservation | undefined {
  const c = code.trim().toUpperCase().replace(/\s/g, "");
  return state.reservations.find((r) => r.code.replace(/-/g, "") === c.replace(/-/g, "") && phonesMatch(r.phone, phone));
}

export interface HourOccupancy {
  hour: number;
  tina: { capacity: number; occupied: number; overbooked: number };
  sauna: { capacity: number; occupied: number; overbooked: number };
}

export function dayOccupancy(state: TermasState, date: string): HourOccupancy[] {
  return SLOT_HOURS.map((hour) => {
    const row = (kind: ResourceKind) => {
      const capacity = capacityAt(state, date, kind, hour);
      const occupied = occupiedAt(state, date, kind, hour);
      return { capacity, occupied, overbooked: Math.max(0, occupied - capacity) };
    };
    return { hour, tina: row("tina"), sauna: row("sauna") };
  });
}

export function makeCode(rand: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += alphabet[Math.floor(rand() * alphabet.length)];
  return `PUN-${s}`;
}
