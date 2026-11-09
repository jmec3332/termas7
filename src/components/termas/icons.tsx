import { Bath, Flame, Waves } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ResourceKind } from "@/lib/termas/types";

export function KindIcon({ kind, className }: { kind: ResourceKind | "piscina"; className?: string }) {
  if (kind === "tina") return <Bath className={cn("size-4", className)} aria-hidden />;
  if (kind === "sauna") return <Flame className={cn("size-4", className)} aria-hidden />;
  return <Waves className={cn("size-4", className)} aria-hidden />;
}

export function KindChip({ kind, label }: { kind: ResourceKind | "piscina"; label: string }) {
  const tone =
    kind === "tina"
      ? "bg-tina-soft text-tina"
      : kind === "sauna"
        ? "bg-sauna-soft text-sauna-ink"
        : "bg-sage-soft text-primary";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold", tone)}>
      <KindIcon kind={kind} className="size-3.5" />
      {label}
    </span>
  );
}
