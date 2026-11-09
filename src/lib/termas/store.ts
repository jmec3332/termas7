import { useSyncExternalStore } from "react";

import * as logic from "./logic";
import { STATE_VERSION, buildSeed } from "./seed";
import type { BookingDraft, OutOfService, Reservation, Season, TermasState } from "./types";

const KEY = "termas-punulaf:v1";

let cache: TermasState | null = null;
const listeners = new Set<() => void>();

function readStorage(): TermasState {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TermasState;
      if (parsed?.version === STATE_VERSION && Array.isArray(parsed.reservations)) {
        cache = parsed;
        return cache;
      }
    }
  } catch {
    // dato corrupto: se vuelve a sembrar
  }
  cache = buildSeed(new Date());
  window.localStorage.setItem(KEY, JSON.stringify(cache));
  return cache;
}

function commit(next: TermasState) {
  cache = next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** null durante SSR y el primer render de hidratación. */
export function useTermasState(): TermasState | null {
  return useSyncExternalStore(subscribe, readStorage, () => null);
}

type R<T> = logic.Result<T>;

export const termas = {
  createReservation(draft: BookingDraft): R<Reservation> {
    const state = readStorage();
    let code = logic.makeCode();
    while (state.reservations.some((r) => r.code === code)) code = logic.makeCode();
    const res = logic.createReservation(state, draft, code, new Date());
    if (!res.ok) return res;
    commit(res.value.state);
    return { ok: true, value: res.value.reservation };
  },
  cancelByCustomer(code: string): R<null> {
    const res = logic.cancelByCustomer(readStorage(), code, new Date());
    if (!res.ok) return res;
    commit(res.value);
    return { ok: true, value: null };
  },
  cancelByAdmin(code: string): R<null> {
    const res = logic.cancelByAdmin(readStorage(), code, new Date());
    if (!res.ok) return res;
    commit(res.value);
    return { ok: true, value: null };
  },
  markNoShow(code: string): R<null> {
    const res = logic.markNoShow(readStorage(), code, new Date());
    if (!res.ok) return res;
    commit(res.value);
    return { ok: true, value: null };
  },
  setSeason(season: Season) {
    commit(logic.setSeason(readStorage(), season));
  },
  addOutOfService(entry: Omit<OutOfService, "id">): R<null> {
    const id = `oos-${Date.now().toString(36)}`;
    const res = logic.addOutOfService(readStorage(), { ...entry, id });
    if (!res.ok) return res;
    commit(res.value);
    return { ok: true, value: null };
  },
  removeOutOfService(id: string) {
    commit(logic.removeOutOfService(readStorage(), id));
  },
  resetDemo() {
    commit(buildSeed(new Date()));
  },
};
