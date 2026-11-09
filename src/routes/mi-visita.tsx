import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ReservationCard, ShareActions } from "@/components/termas/ReservationCard";
import { PageLoading } from "@/components/termas/SiteHeader";
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
import { useNow } from "@/hooks/use-now";
import { canCustomerCancel, findReservation } from "@/lib/termas/logic";
import { DEMO_LOOKUPS } from "@/lib/termas/seed";
import { termas, useTermasState } from "@/lib/termas/store";
import type { TermasState } from "@/lib/termas/types";

type Search = { codigo?: string };

export const Route = createFileRoute("/mi-visita")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search.codigo === "string" && search.codigo ? { codigo: search.codigo } : {},
  head: () => ({
    meta: [
      { title: "Mi visita · Termas Punulaf" },
      { name: "description", content: "Buscá tu reserva con el código y tu celular, compartila o cancelala hasta 24 h antes." },
      { property: "og:title", content: "Mi visita · Termas Punulaf" },
      { property: "og:description", content: "Buscá tu reserva con el código y tu celular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MiVisitaPage,
});

function MiVisitaPage() {
  const state = useTermasState();
  const { codigo } = Route.useSearch();
  if (!state) return <PageLoading />;
  return <MiVisita state={state} initialCode={codigo ?? ""} />;
}

function MiVisita({ state, initialCode }: { state: TermasState; initialCode: string }) {
  const now = useNow();
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState("");
  const [foundCode, setFoundCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const r = foundCode ? state.reservations.find((x) => x.code === foundCode) : undefined;

  function search(e: React.FormEvent) {
    e.preventDefault();
    const hit = findReservation(state, code, phone);
    if (!hit) {
      setFoundCode(null);
      setError("No encontramos una reserva con ese código y celular. Revisá que estén bien escritos.");
      return;
    }
    setError(null);
    setFoundCode(hit.code);
  }

  function cancel() {
    if (!r) return;
    const res = termas.cancelByCustomer(r.code);
    if (res.ok) toast.success("Reserva cancelada. Los turnos ya quedaron libres.");
    else toast.error(res.error);
  }

  const cancelCheck = r ? canCustomerCancel(r, now) : null;

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-5">
      <div>
        <h1 className="text-2xl font-bold">Mi visita</h1>
        <p className="text-sm text-muted-foreground">Buscá tu reserva con el código y el celular que dejaste.</p>
      </div>

      <form onSubmit={search} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="PUN-XXXX"
              autoCapitalize="characters"
              className="h-11 font-bold tracking-wider"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Celular</Label>
            <Input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56 9 1234 5678" className="h-11" />
          </div>
        </div>
        {error && (
          <p role="alert" className="rounded-md bg-warning-soft px-3 py-2 text-xs font-bold text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full">
          <Search /> Buscar reserva
        </Button>
        <p className="text-[0.7rem] leading-snug text-muted-foreground">
          Para probar la demo: <strong>{DEMO_LOOKUPS.cancelable.code}</strong> · {DEMO_LOOKUPS.cancelable.phone} (se puede cancelar) o{" "}
          <strong>{DEMO_LOOKUPS.late.code}</strong> · {DEMO_LOOKUPS.late.phone} (menos de 24 h).
        </p>
      </form>

      {r && (
        <div className="animate-rise space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm">
              Reserva de <strong>{r.name}</strong>
            </p>
            <span className="font-serif text-sm font-black tracking-widest text-primary">{r.code}</span>
          </div>
          <ReservationCard r={r} />
          {r.status === "confirmada" && <ShareActions r={r} />}

          {r.status === "confirmada" && cancelCheck?.ok && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="w-full text-destructive hover:bg-warning-soft hover:text-destructive">
                  Cancelar reserva
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cancelamos tu reserva?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Faltan más de 24 h, así que se liberan todos tus turnos para que los use otra familia. Esto no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Mejor no</AlertDialogCancel>
                  <AlertDialogAction onClick={cancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Sí, cancelar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {r.status === "confirmada" && cancelCheck && !cancelCheck.ok && (
            <p className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs leading-snug">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden />
              {cancelCheck.reason}
            </p>
          )}

          {r.status === "cancelada" && (
            <div className="rounded-lg bg-muted px-3 py-2 text-center text-xs">
              Esta reserva está cancelada y los turnos quedaron libres.{" "}
              <Link to="/reservar" className="font-bold text-primary underline-offset-4 hover:underline">
                Hacer una nueva
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
