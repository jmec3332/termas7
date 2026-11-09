import { CLOSE_HOUR, DURATION_MIN, KIND_LABEL, OPEN_HOUR, VENUE, getPackage } from "./config";
import { hh, longDate, money, rangeLabel } from "./dates";
import type { Reservation } from "./types";

function peopleLabel(r: Reservation): string {
  const p = r.people === 1 ? "1 persona" : `${r.people} personas`;
  if (!r.infants) return p;
  return `${p} + ${r.infants} ${r.infants === 1 ? "menor" : "menores"} de 4`;
}

export function turnLines(r: Reservation): string[] {
  return r.turns.map((t) => {
    const L = KIND_LABEL[t.kind];
    const units = `${t.units} ${t.units === 1 ? L.one : L.many}`;
    const name = t.kind === "tina" ? "Tina" : "Sauna";
    return `${name}: ${rangeLabel(t.hour, DURATION_MIN[t.kind])} (${units})`;
  });
}

export function whatsappText(r: Reservation): string {
  const pkg = getPackage(r.packageId);
  return [
    `¡Hola! Tengo reserva en ${VENUE.name}.`,
    ``,
    `Código: ${r.code}`,
    `Paquete: ${pkg.name}`,
    `Fecha: ${longDate(r.date)}`,
    ...turnLines(r),
    `Piscinas: libres de ${hh(OPEN_HOUR)} a ${hh(CLOSE_HOUR)}`,
    `Grupo: ${peopleLabel(r)}`,
    `Total: ${money(r.total)}`,
    ``,
    `Si necesitás cambiar algo, entrá a "Mi visita" con el código y tu celular.`,
  ].join("\n");
}

export function whatsappUrl(r: Reservation): string {
  return `https://wa.me/?text=${encodeURIComponent(whatsappText(r))}`;
}

function icsDate(date: string, hour: number, minute = 0): string {
  return `${date.replace(/-/g, "")}T${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}00`;
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildICS(r: Reservation, now: Date = new Date()): string {
  const pkg = getPackage(r.packageId);
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const description = esc(whatsappText(r));
  const events =
    r.turns.length > 0
      ? r.turns.map((t) => {
          const end = t.hour * 60 + DURATION_MIN[t.kind];
          return {
            uid: `${r.code}-${t.kind}@termaspunulaf.cl`,
            start: icsDate(r.date, t.hour),
            end: icsDate(r.date, Math.floor(end / 60), end % 60),
            summary: `${t.kind === "tina" ? "Tina" : "Sauna"} · ${VENUE.name} (${r.code})`,
          };
        })
      : [
          {
            uid: `${r.code}-piscinas@termaspunulaf.cl`,
            start: icsDate(r.date, OPEN_HOUR),
            end: icsDate(r.date, CLOSE_HOUR),
            summary: `${pkg.name} · ${VENUE.name} (${r.code})`,
          },
        ];

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Termas Punulaf//Reservas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${e.start}`,
      `DTEND:${e.end}`,
      `SUMMARY:${esc(e.summary)}`,
      `LOCATION:${esc(VENUE.place)}`,
      `DESCRIPTION:${description}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT2H",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(e.summary)}`,
      "END:VALARM",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function downloadICS(r: Reservation) {
  const blob = new Blob([buildICS(r)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `termas-punulaf-${r.code}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
