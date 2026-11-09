import { Link } from "@tanstack/react-router";
import { Mountain } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 text-primary">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <Mountain className="size-4" aria-hidden />
          </span>
          <span className="font-serif text-base font-bold leading-none">
            Termas <span className="text-sauna-ink">Punulaf</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-bold">
          <Link
            to="/reservar"
            className="rounded-full px-3 py-1.5 text-foreground/80 transition-colors hover:bg-muted"
            activeProps={{ className: "bg-secondary text-secondary-foreground" }}
          >
            Reservar
          </Link>
          <Link
            to="/mi-visita"
            className="rounded-full px-3 py-1.5 text-foreground/80 transition-colors hover:bg-muted"
            activeProps={{ className: "bg-secondary text-secondary-foreground" }}
          >
            Mi visita
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground">
      <span>Termas Punulaf · Abierto de 10:00 a 18:00 · Demo con datos ficticios</span>
      <Link to="/admin" className="font-bold underline-offset-4 hover:underline">
        Panel del recinto
      </Link>
    </footer>
  );
}

export function PageLoading() {
  return (
    <div className="mx-auto max-w-xl space-y-3 px-4 py-6" aria-busy="true">
      <div className="h-7 w-2/3 animate-pulse rounded-md bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
