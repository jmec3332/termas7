import { createFileRoute } from "@tanstack/react-router";
import { LogOut, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminGate, OccupancyView, OutOfServiceView, SeasonView } from "@/components/termas/admin";
import { DateStrip } from "@/components/termas/controls";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNow } from "@/hooks/use-now";
import { SEASON_LABEL } from "@/lib/termas/config";
import { toISODate } from "@/lib/termas/dates";
import { termas, useTermasState } from "@/lib/termas/store";

const SESSION_KEY = "termas-punulaf:admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel del recinto · Termas Punulaf" },
      { name: "description", content: "Ocupación diaria, recursos fuera de servicio y temporada de Termas Punulaf." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Panel del recinto · Termas Punulaf" },
      { property: "og:description", content: "Ocupación diaria, recursos fuera de servicio y temporada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const state = useTermasState();
  const [unlocked, setUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    setUnlocked(window.sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  if (!state || unlocked === null) return <PageLoading />;
  if (!unlocked)
    return (
      <AdminGate
        onUnlock={() => {
          window.sessionStorage.setItem(SESSION_KEY, "1");
          setUnlocked(true);
        }}
      />
    );

  return (
    <AdminPanel
      onLogout={() => {
        window.sessionStorage.removeItem(SESSION_KEY);
        setUnlocked(false);
      }}
    />
  );
}

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const state = useTermasState()!;
  const now = useNow();
  const today = toISODate(now);
  const [date, setDate] = useState(today);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Panel del recinto</h1>
          <p className="text-xs text-muted-foreground">
            {SEASON_LABEL[state.settings.season]} · datos guardados en este navegador
          </p>
        </div>
        <div className="flex gap-1.5">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline">
                <RotateCcw /> Demo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Restablecer los datos de demo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se borran las reservas y cortes cargados en este navegador y se vuelven a crear los de ejemplo con fechas desde hoy.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    termas.resetDemo();
                    setDate(today);
                    toast.success("Datos de demo restablecidos.");
                  }}
                >
                  Restablecer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" variant="ghost" onClick={onLogout}>
            <LogOut /> Salir
          </Button>
        </div>
      </div>

      <DateStrip value={date} onChange={setDate} today={today} />

      <Tabs defaultValue="ocupacion">
        <TabsList className="grid h-10 w-full grid-cols-3">
          <TabsTrigger value="ocupacion" className="h-8">Ocupación</TabsTrigger>
          <TabsTrigger value="servicio" className="h-8">Fuera de servicio</TabsTrigger>
          <TabsTrigger value="temporada" className="h-8">Temporada</TabsTrigger>
        </TabsList>
        <TabsContent value="ocupacion" className="mt-4">
          <OccupancyView state={state} date={date} now={now} />
        </TabsContent>
        <TabsContent value="servicio" className="mt-4">
          <OutOfServiceView state={state} date={date} today={today} />
        </TabsContent>
        <TabsContent value="temporada" className="mt-4">
          <SeasonView state={state} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
