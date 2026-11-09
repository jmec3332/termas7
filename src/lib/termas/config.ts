import type { PackageId, ResourceKind, Season } from "./types";

export const VENUE = {
  name: "Termas Punulaf",
  place: "Valle de Punulaf, Región de La Araucanía",
  phoneDisplay: "+56 9 4100 2026",
};

export const ADMIN_PASSWORD = "termas2026";

export const OPEN_HOUR = 10;
export const CLOSE_HOUR = 18;
/** Turnos en punto: el último arranca a las 17:00 para terminar antes del cierre. */
export const SLOT_HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);

export const TOTAL_UNITS: Record<ResourceKind, number> = { tina: 12, sauna: 5 };
export const DURATION_MIN: Record<ResourceKind, number> = { tina: 45, sauna: 30 };

export const MAX_PEOPLE = 6;
export const CANCEL_WINDOW_HOURS = 24;
export const BOOKING_HORIZON_DAYS = 60;

export const KIND_LABEL: Record<ResourceKind, { one: string; many: string }> = {
  tina: { one: "tina", many: "tinas" },
  sauna: { one: "sauna", many: "saunas" },
};

export interface PackageDef {
  id: PackageId;
  name: string;
  tagline: string;
  includes: { tina: boolean; sauna: boolean };
  prices: Record<Season, number>;
}

export const PACKAGES: PackageDef[] = [
  {
    id: "piscinas",
    name: "Piscinas Libres",
    tagline: "Entrás y salís de las piscinas cuando quieras, todo el día.",
    includes: { tina: false, sauna: false },
    prices: { baja: 12000, alta: 15000 },
  },
  {
    id: "tina",
    name: "Tina y Piscinas",
    tagline: "Un turno de tina de 45 min + piscinas todo el día.",
    includes: { tina: true, sauna: false },
    prices: { baja: 16000, alta: 20000 },
  },
  {
    id: "sauna",
    name: "Sauna y Piscinas",
    tagline: "Un turno de sauna de 30 min + piscinas todo el día.",
    includes: { tina: false, sauna: true },
    prices: { baja: 15000, alta: 19000 },
  },
  {
    id: "completo",
    name: "Día Completo",
    tagline: "Tina y sauna en horarios distintos + piscinas todo el día.",
    includes: { tina: true, sauna: true },
    prices: { baja: 20000, alta: 25000 },
  },
];

export function getPackage(id: PackageId): PackageDef {
  const p = PACKAGES.find((x) => x.id === id);
  if (!p) throw new Error(`Paquete desconocido: ${id}`);
  return p;
}

export const SEASON_LABEL: Record<Season, string> = { baja: "Temporada baja", alta: "Temporada alta" };
