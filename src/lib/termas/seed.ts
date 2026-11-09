import { quote, unitsNeeded } from "./logic";
import { addDays, toISODate } from "./dates";
import type { OutOfService, PackageId, Reservation, TermasState } from "./types";

export const STATE_VERSION = 1;

/** Reservas de prueba para la demo (datos ficticios). */
export const DEMO_LOOKUPS = {
  cancelable: { code: "PUN-7K3M", phone: "9 8765 4321" },
  late: { code: "PUN-2Q8R", phone: "9 6123 4870" },
};

interface SeedRow {
  code: string;
  pkg: PackageId;
  day: number;
  people: number;
  infants?: number;
  name: string;
  phone: string;
  tina?: number;
  sauna?: number;
}

const ROWS: SeedRow[] = [
  // Hoy
  { code: "PUN-H4TB", pkg: "completo", day: 0, people: 2, name: "Matías Soto", phone: "+56 9 7231 0498", tina: 10, sauna: 11 },
  { code: "PUN-9WQE", pkg: "tina", day: 0, people: 3, infants: 1, name: "Javiera Muñoz", phone: "+56 9 8812 3375", tina: 12 },
  { code: "PUN-ZX5N", pkg: "sauna", day: 0, people: 5, name: "Benjamín Rojas", phone: "+56 9 6640 1182", sauna: 14 },
  { code: "PUN-PP3D", pkg: "piscinas", day: 0, people: 2, name: "Fernanda Contreras", phone: "+56 9 9017 2264" },
  { code: "PUN-2Q8R", pkg: "tina", day: 0, people: 2, name: "Diego Araya", phone: "+56 9 6123 4870", tina: 17 },

  // Mañana: 11:00 casi lleno de tinas, 15:00 sin tinas, 12:00 sin saunas
  { code: "PUN-K8RM", pkg: "tina", day: 1, people: 4, name: "Valentina Pizarro", phone: "+56 9 7745 9021", tina: 11 },
  { code: "PUN-B6YT", pkg: "completo", day: 1, people: 3, name: "Tomás Vergara", phone: "+56 9 8320 1145", tina: 11, sauna: 14 },
  { code: "PUN-C3JS", pkg: "tina", day: 1, people: 2, name: "Catalina Espinoza", phone: "+56 9 5598 3307", tina: 11 },
  { code: "PUN-F7GA", pkg: "completo", day: 1, people: 4, infants: 2, name: "Sebastián Tapia", phone: "+56 9 9471 6650", tina: 15, sauna: 12 },
  { code: "PUN-M2VX", pkg: "tina", day: 1, people: 4, name: "Antonia Reyes", phone: "+56 9 6205 7789", tina: 15 },
  { code: "PUN-R9LD", pkg: "tina", day: 1, people: 3, name: "Joaquín Sepúlveda", phone: "+56 9 7380 4412", tina: 15 },
  { code: "PUN-T4NW", pkg: "sauna", day: 1, people: 2, name: "Isidora Morales", phone: "+56 9 8156 2093", sauna: 12 },
  { code: "PUN-W8EQ", pkg: "sauna", day: 1, people: 3, name: "Felipe Carrasco", phone: "+56 9 9903 1576", sauna: 12 },
  { code: "PUN-Y5HK", pkg: "sauna", day: 1, people: 6, name: "Martina Vidal", phone: "+56 9 5437 8820", sauna: 12 },
  { code: "PUN-D3PU", pkg: "piscinas", day: 1, people: 4, infants: 1, name: "Nicolás Gallardo", phone: "+56 9 6672 0934" },

  // Próximos días
  { code: "PUN-G6CZ", pkg: "completo", day: 2, people: 2, name: "Constanza Bravo", phone: "+56 9 7718 4456", tina: 13, sauna: 16 },
  { code: "PUN-J2SB", pkg: "tina", day: 2, people: 5, name: "Ignacio Navarro", phone: "+56 9 8264 3391", tina: 10 },
  { code: "PUN-7K3M", pkg: "completo", day: 3, people: 4, infants: 1, name: "Camila Fuentes", phone: "+56 9 8765 4321", tina: 11, sauna: 15 },
  { code: "PUN-L5AR", pkg: "sauna", day: 3, people: 4, name: "Agustín Riquelme", phone: "+56 9 5129 6604", sauna: 15 },
  { code: "PUN-N8XF", pkg: "tina", day: 4, people: 2, name: "Florencia Cáceres", phone: "+56 9 9345 2218", tina: 16 },
];

export function buildSeed(now: Date): TermasState {
  const today = toISODate(now);
  const createdAt = new Date(now.getTime() - 3 * 86_400_000).toISOString();

  const reservations: Reservation[] = ROWS.map((row) => {
    const { pricePerPerson, total } = quote(row.pkg, "baja", row.people);
    const turns: Reservation["turns"] = [];
    if (row.tina != null) turns.push({ kind: "tina", hour: row.tina, units: unitsNeeded("tina", row.people) });
    if (row.sauna != null) turns.push({ kind: "sauna", hour: row.sauna, units: unitsNeeded("sauna", row.people) });
    return {
      code: row.code,
      packageId: row.pkg,
      date: addDays(today, row.day),
      people: row.people,
      infants: row.infants ?? 0,
      name: row.name,
      phone: row.phone,
      turns,
      season: "baja",
      pricePerPerson,
      total,
      status: "confirmada",
      createdAt,
    };
  });

  const tomorrow = addDays(today, 1);
  const outOfService: OutOfService[] = [
    { id: "oos-1", date: tomorrow, kind: "tina", units: [7], fromHour: 10, toHour: 18, reason: "Cambio de bomba de recirculación" },
    { id: "oos-2", date: tomorrow, kind: "sauna", units: [2], fromHour: 15, toHour: 17, reason: "Mantención de estufa" },
    { id: "oos-3", date: tomorrow, kind: "sauna", units: [1, 2, 3, 4, 5], fromHour: 17, toHour: 18, reason: "Limpieza profunda de saunas" },
    { id: "oos-4", date: addDays(today, 2), kind: "tina", units: [3, 4], fromHour: 10, toHour: 13, reason: "Recambio de agua termal" },
  ];

  return {
    version: STATE_VERSION,
    seededAt: now.toISOString(),
    settings: { season: "baja" },
    reservations,
    outOfService,
  };
}
