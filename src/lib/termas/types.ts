export type ResourceKind = "tina" | "sauna";
export type PackageId = "piscinas" | "tina" | "sauna" | "completo";
export type Season = "baja" | "alta";

/**
 * confirmada      -> ocupa recursos
 * cancelada       -> cancelada con más de 24 h: libera recursos
 * cancelada_tarde -> cancelada con menos de 24 h (solo el recinto): NO libera
 * no_vino         -> el horario ya pasó y no se presentó: NO libera
 */
export type ReservationStatus = "confirmada" | "cancelada" | "cancelada_tarde" | "no_vino";

export interface Turn {
  kind: ResourceKind;
  /** Hora de inicio en punto (10..17). */
  hour: number;
  /** Unidades que ocupa (tinas o saunas). */
  units: number;
}

export interface Reservation {
  code: string;
  packageId: PackageId;
  /** Fecha local YYYY-MM-DD */
  date: string;
  /** Personas de 4 años o más (las que pagan y ocupan tina). */
  people: number;
  /** Menores de 4 años: no pagan y comparten tina con un adulto. */
  infants: number;
  name: string;
  phone: string;
  email?: string;
  turns: Turn[];
  /** Precio congelado al momento de reservar. */
  season: Season;
  pricePerPerson: number;
  total: number;
  status: ReservationStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface OutOfService {
  id: string;
  date: string;
  kind: ResourceKind;
  /** Números de unidad afectados (1..12 tinas, 1..5 saunas). */
  units: number[];
  /** Hora de inicio incluida. */
  fromHour: number;
  /** Hora de término excluida (18 = hasta el cierre). */
  toHour: number;
  reason: string;
}

export interface Settings {
  season: Season;
}

export interface TermasState {
  version: number;
  seededAt: string;
  settings: Settings;
  reservations: Reservation[];
  outOfService: OutOfService[];
}

export interface BookingDraft {
  packageId: PackageId;
  date: string;
  people: number;
  infants: number;
  tinaHour?: number;
  saunaHour?: number;
  name: string;
  phone: string;
  email?: string;
}
