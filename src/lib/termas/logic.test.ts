import { describe, expect, it } from "vitest";

import {
  cancelByAdmin,
  cancelByCustomer,
  capacityAt,
  createReservation,
  freeAt,
  markNoShow,
  setSeason,
  slotInfo,
  unitsNeeded,
  addOutOfService,
  findReservation,
} from "./logic";
import { buildICS } from "./share";
import type { BookingDraft, TermasState } from "./types";

const DAY = "2026-11-20";
const NOW = new Date(2026, 10, 15, 9, 0); // 5 días antes

function empty(season: "baja" | "alta" = "baja"): TermasState {
  return { version: 1, seededAt: NOW.toISOString(), settings: { season }, reservations: [], outOfService: [] };
}

function draft(over: Partial<BookingDraft> = {}): BookingDraft {
  return { packageId: "tina", date: DAY, people: 1, infants: 0, tinaHour: 11, name: "Prueba", phone: "+56 9 1111 2222", ...over };
}

function book(state: TermasState, over: Partial<BookingDraft>, code: string, now = NOW): TermasState {
  const res = createReservation(state, draft(over), code, now);
  if (!res.ok) throw new Error(res.error);
  return res.value.state;
}

describe("tinas", () => {
  it("un grupo de 4 no puede reservar si quedan 3 tinas", () => {
    let s = empty();
    s = book(s, { people: 6, tinaHour: 11 }, "A1");
    s = book(s, { people: 3, tinaHour: 11 }, "A2"); // quedan 3
    expect(freeAt(s, DAY, "tina", 11)).toBe(3);
    const info = slotInfo(s, { date: DAY, kind: "tina", hour: 11, people: 4, now: NOW });
    expect(info.available).toBe(false);
    expect(info.label).toBe("Quedan 3 tinas, necesitás 4");
    expect(createReservation(s, draft({ people: 4 }), "X", NOW).ok).toBe(false);
  });

  it("un grupo de 4 sí reserva con 4 tinas libres y ocupa 4", () => {
    let s = empty();
    s = book(s, { people: 6 }, "A1");
    s = book(s, { people: 2 }, "A2"); // quedan 4
    s = book(s, { people: 4 }, "A3");
    expect(freeAt(s, DAY, "tina", 11)).toBe(0);
    expect(slotInfo(s, { date: DAY, kind: "tina", hour: 11, people: 1, now: NOW }).label).toBe("Sin tinas");
  });

  it("los menores de 4 no ocupan tina", () => {
    const s = book(empty(), { people: 2, infants: 2 }, "A1");
    expect(freeAt(s, DAY, "tina", 11)).toBe(10);
  });
});

describe("saunas", () => {
  it("1-4 personas usan una sauna, 5-6 usan dos", () => {
    expect([1, 2, 3, 4].map((p) => unitsNeeded("sauna", p))).toEqual([1, 1, 1, 1]);
    expect(unitsNeeded("sauna", 5)).toBe(2);
    expect(unitsNeeded("sauna", 6)).toBe(2);
  });

  it("la sauna solo está disponible si queda una unidad libre", () => {
    let s = empty();
    for (const c of ["S1", "S2", "S3", "S4"]) s = book(s, { packageId: "sauna", saunaHour: 12, tinaHour: undefined, people: 2 }, c);
    expect(slotInfo(s, { date: DAY, kind: "sauna", hour: 12, people: 3, now: NOW }).available).toBe(true);
    s = book(s, { packageId: "sauna", saunaHour: 12, tinaHour: undefined, people: 2 }, "S5");
    const info = slotInfo(s, { date: DAY, kind: "sauna", hour: 12, people: 1, now: NOW });
    expect(info.available).toBe(false);
    expect(info.label).toBe("Sin saunas");
  });

  it("un grupo de 5 necesita dos saunas libres", () => {
    let s = empty();
    for (const c of ["S1", "S2", "S3", "S4"]) s = book(s, { packageId: "sauna", saunaHour: 12, tinaHour: undefined, people: 2 }, c);
    const info = slotInfo(s, { date: DAY, kind: "sauna", hour: 12, people: 5, now: NOW });
    expect(info.available).toBe(false);
    expect(info.label).toBe("Queda 1 sauna, necesitás 2");
  });
});

describe("Día Completo", () => {
  it("tina y sauna a la misma hora se bloquean y muestran el motivo", () => {
    const info = slotInfo(empty(), { date: DAY, kind: "sauna", hour: 11, people: 2, now: NOW, otherTurn: { kind: "tina", hour: 11 } });
    expect(info.available).toBe(false);
    expect(info.label).toBe("Se cruza con tu tina de 11:00");
    const res = createReservation(empty(), draft({ packageId: "completo", tinaHour: 11, saunaHour: 11 }), "X", NOW);
    expect(res.ok).toBe(false);
  });

  it("tina 11:00 y sauna 12:00 sí se pueden reservar", () => {
    const res = createReservation(empty(), draft({ packageId: "completo", tinaHour: 11, saunaHour: 12 }), "X", NOW);
    expect(res.ok).toBe(true);
  });
});

describe("fuera de servicio", () => {
  it("reduce el cupo de ese día y muestra el motivo cuando no queda ninguna", () => {
    let s = empty();
    const r1 = addOutOfService(s, { id: "o1", date: DAY, kind: "tina", units: [1, 2], fromHour: 10, toHour: 18, reason: "Cambio de bomba" });
    if (!r1.ok) throw new Error(r1.error);
    s = r1.value;
    expect(capacityAt(s, DAY, "tina", 14)).toBe(10);
    expect(capacityAt(s, "2026-11-21", "tina", 14)).toBe(12);
    const r2 = addOutOfService(s, { id: "o2", date: DAY, kind: "sauna", units: [1, 2, 3, 4, 5], fromHour: 17, toHour: 18, reason: "Limpieza profunda" });
    if (!r2.ok) throw new Error(r2.error);
    const info = slotInfo(r2.value, { date: DAY, kind: "sauna", hour: 17, people: 1, now: NOW });
    expect(info.available).toBe(false);
    expect(info.label).toBe("Limpieza profunda");
  });
});

describe("temporada", () => {
  it("cambiar la temporada solo afecta reservas nuevas", () => {
    let s = book(empty("baja"), { people: 2 }, "OLD");
    s = setSeason(s, "alta");
    s = book(s, { people: 2, tinaHour: 12 }, "NEW");
    const old = s.reservations.find((r) => r.code === "OLD")!;
    const neu = s.reservations.find((r) => r.code === "NEW")!;
    expect(old.pricePerPerson).toBe(16000);
    expect(old.total).toBe(32000);
    expect(neu.pricePerPerson).toBe(20000);
    expect(neu.total).toBe(40000);
  });
});

describe("cancelaciones y no vino", () => {
  it("cancelar con más de 24 h libera todos los turnos", () => {
    let s = book(empty(), { packageId: "completo", people: 5, tinaHour: 11, saunaHour: 13 }, "C1");
    expect(freeAt(s, DAY, "tina", 11)).toBe(7);
    expect(freeAt(s, DAY, "sauna", 13)).toBe(3);
    const res = cancelByCustomer(s, "C1", new Date(2026, 10, 19, 10, 0)); // 25 h antes
    if (!res.ok) throw new Error(res.error);
    s = res.value;
    expect(freeAt(s, DAY, "tina", 11)).toBe(12);
    expect(freeAt(s, DAY, "sauna", 13)).toBe(5);
  });

  it("con menos de 24 h el cliente no puede cancelar y el recinto la registra sin liberar", () => {
    const s = book(empty(), { people: 3 }, "C2");
    const late = new Date(2026, 10, 19, 12, 0); // 23 h antes
    expect(cancelByCustomer(s, "C2", late).ok).toBe(false);
    const res = cancelByAdmin(s, "C2", late);
    if (!res.ok) throw new Error(res.error);
    expect(res.value.reservations[0].status).toBe("cancelada_tarde");
    expect(freeAt(res.value, DAY, "tina", 11)).toBe(9);
  });

  it("marcar No vino después del horario no libera el turno", () => {
    const s = book(empty(), { people: 3 }, "C3");
    expect(markNoShow(s, "C3", NOW).ok).toBe(false);
    const res = markNoShow(s, "C3", new Date(2026, 10, 20, 12, 0));
    if (!res.ok) throw new Error(res.error);
    expect(freeAt(res.value, DAY, "tina", 11)).toBe(9);
  });
});

describe("Mi visita y calendario", () => {
  it("encuentra la reserva por código y celular, sin importar el formato", () => {
    const s = book(empty(), { phone: "+56 9 8765 4321" }, "PUN-7K3M");
    expect(findReservation(s, "pun-7k3m", "987654321")?.code).toBe("PUN-7K3M");
    expect(findReservation(s, "PUN-7K3M", "911112222")).toBeUndefined();
  });

  it("el ICS trae un evento por turno con su horario", () => {
    const s = book(empty(), { packageId: "completo", tinaHour: 11, saunaHour: 15 }, "PUN-ICS1");
    const ics = buildICS(s.reservations[0], NOW);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART:20261120T110000");
    expect(ics).toContain("DTEND:20261120T114500");
    expect(ics).toContain("DTSTART:20261120T150000");
    expect(ics).toContain("DTEND:20261120T153000");
  });
});
