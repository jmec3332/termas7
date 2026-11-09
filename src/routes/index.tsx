import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Search } from "lucide-react";

import heroImg from "@/assets/termas-hero.jpg";
import { KindChip } from "@/components/termas/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PACKAGES, SEASON_LABEL } from "@/lib/termas/config";
import { money } from "@/lib/termas/dates";
import { useTermasState } from "@/lib/termas/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Termas Punulaf · Tinas, saunas y piscinas termales" },
      {
        name: "description",
        content: "Reservá tu tina, sauna o día completo en Termas Punulaf. Piscinas libres todo el día, de 10:00 a 18:00.",
      },
      { property: "og:title", content: "Termas Punulaf · Tinas, saunas y piscinas termales" },
      {
        property: "og:description",
        content: "Reservá tu tina, sauna o día completo en Termas Punulaf. Piscinas libres todo el día.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const state = useTermasState();
  const season = state?.settings.season;

  return (
    <div>
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImg}
          alt="Tinas de madera y piscina termal humeando entre araucarias, con un volcán nevado al fondo"
          width={1280}
          height={832}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-hero-fade" />
        <div className="mx-auto flex min-h-[23rem] max-w-5xl flex-col justify-end px-4 pb-7 pt-24 text-primary-foreground sm:min-h-[28rem]">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] opacity-90">Cordillera de La Araucanía</p>
          <h1 className="max-w-lg text-3xl font-black leading-tight sm:text-5xl">
            Agua termal, madera y cordillera.
          </h1>
          <p className="mt-2 max-w-md text-sm opacity-90 sm:text-base">
            Elegí tu paquete, mirá los cupos en vivo y reservá en un minuto.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="hero" size="lg">
              <Link to="/reservar">
                Reservar ahora <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="glass" size="lg">
              <Link to="/mi-visita">
                <Search /> Mi visita
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-grain">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold">Paquetes</h2>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" aria-hidden /> 10:00 a 18:00 · precios por persona
              {season && (
                <span className="rounded-full bg-sauna-soft px-2 py-0.5 font-bold text-sauna-ink">
                  {SEASON_LABEL[season]}
                </span>
              )}
            </p>
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {PACKAGES.map((p) => (
              <li key={p.id}>
                <Link
                  to="/reservar"
                  search={{ paquete: p.id }}
                  className="group flex h-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:border-sage"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-base font-bold">{p.name}</h3>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{p.tagline}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.includes.tina && <KindChip kind="tina" label="Tina 45'" />}
                      {p.includes.sauna && <KindChip kind="sauna" label="Sauna 30'" />}
                      <KindChip kind="piscina" label="Piscinas" />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {(["baja", "alta"] as const).map((s) => (
                      <p
                        key={s}
                        className={cn(
                          "leading-tight",
                          season === s ? "font-serif text-lg font-black text-primary" : "text-xs text-muted-foreground",
                        )}
                      >
                        {season !== s && <span className="mr-1 capitalize">{s}</span>}
                        {money(p.prices[s])}
                      </p>
                    ))}
                    <ArrowRight className="ml-auto mt-1 size-4 text-sage transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Los menores de 4 años no pagan y comparten tina con un adulto. Grupos de hasta 6 personas por reserva.
          </p>
        </div>
      </section>
    </div>
  );
}
