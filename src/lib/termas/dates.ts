import { format } from "date-fns";
import { es } from "date-fns/locale";

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function atTime(iso: string, hour: number, minute = 0): Date {
  const d = parseISODate(iso);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function hh(hour: number, minute = 0): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function rangeLabel(hour: number, durationMin: number): string {
  const end = hour * 60 + durationMin;
  return `${hh(hour)} – ${hh(Math.floor(end / 60), end % 60)}`;
}

export function longDate(iso: string): string {
  return format(parseISODate(iso), "EEEE d 'de' MMMM", { locale: es });
}

export function shortDate(iso: string): { weekday: string; day: string; month: string } {
  const d = parseISODate(iso);
  return {
    weekday: format(d, "EEE", { locale: es }).replace(".", ""),
    day: format(d, "d"),
    month: format(d, "MMM", { locale: es }).replace(".", ""),
  };
}

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
export function money(n: number): string {
  return clp.format(n);
}
