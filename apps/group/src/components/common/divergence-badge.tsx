import * as React from "react";
import { Badge } from "@v7m/ui";
import { AlertTriangle, Sparkles } from "lucide-react";

interface DivergenceBadgeProps {
  label: string;
  type?: "name" | "photo" | "ocr" | "general";
  className?: string;
}

export function DivergenceBadge({
  label,
  type = "general",
  className,
}: DivergenceBadgeProps) {
  const IconComponent = type === "photo" ? AlertTriangle : Sparkles;

  return (
    <Badge variant="outline" className={`gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30 text-[11px] ${className || ""}`}>
      <IconComponent className="size-3 text-amber-500" />
      <span>{label}</span>
    </Badge>
  );
}
