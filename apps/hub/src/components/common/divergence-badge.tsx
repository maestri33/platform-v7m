import * as React from "react";
import { Badge } from "@/components/ui/badge";
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
  const icon = type === "photo" ? AlertTriangle : Sparkles;
  const IconComponent = icon;

  return (
    <Badge variant="warning" className={className}>
      <IconComponent className="h-3 w-3 text-brand-amber" />
      {label}
    </Badge>
  );
}
