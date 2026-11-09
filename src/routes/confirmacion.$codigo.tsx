import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, PartyPopper } from "lucide-react";
import { toast } from "sonner";

import { ReservationCard, ShareActions } from "@/components/termas/ReservationCard";
import { PageLoading } from "@/components/termas/SiteHeader";
import { Button } from "@/components/ui/button";
import { useTermasState } from "@/lib/termas/store";

export const Route = createFileRoute("/confirmacion/$codigo")({
  head: () => ({
    meta: [
      { title: "Reserva confirmada · Termas Punulaf" },
      { name: "description", content: "Tu reserva en Termas Punulaf está lista. Compartila por WhatsApp o sumala a tu calendario." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Reserva confirmada · Termas Punulaf" },
      { property: "og:description", content: "Tu reserva en Termas Punulaf está lista." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Confirmacion,
});

function Confirmacion() {
  const { codigo } = Route.useParams();
  const state = useTermasState();
  if (!state) return <PageLoading />;
  const r = state.reservations.find((x) => x.code === codigo);

  if (!r) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <h1 className="text-xl font-bold">No encontramos la reserva {codigo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Puede que se haya hecho en otro dispositivo. Buscala con tu celular.</p>
        <Button asChild className="mt-5">
          <Link to="/mi-visita" search={{ codigo }}>
            Ir a Mi visita
          </Link>
        </Button>
      </div>
    );
  }

  const firstName = r.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-5">
      <div className="animate-rise text-center">
        <span className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-secondary text-primary">
          <PartyPopper className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-black">¡Listo, {firstName}!</h1>
        <p className="text-sm text-muted-foreground">Tu reserva quedó confirmada. Guardá el código.</p>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(r.code).then(() => toast.success("Código copiado"));
          }}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-sage bg-card px-4 py-2 font-serif text-2xl font-black tracking-widest text-primary"
          aria-label={`Copiar código ${r.code}`}
        >
          {r.code}
          <Copy className="size-4 text-muted-foreground" aria-hidden />
        </button>
      </div>

      <ReservationCard r={r} />
      <ShareActions r={r} />

      <p className="text-center text-xs leading-snug text-muted-foreground">
        Podés cancelar sin costo hasta 24 h antes de tu primer turno desde{" "}
        <Link to="/mi-visita" search={{ codigo: r.code }} className="font-bold text-primary underline-offset-4 hover:underline">
          Mi visita
        </Link>
        .
      </p>
    </div>
  );
}
