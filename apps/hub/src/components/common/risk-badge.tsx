import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";

interface RiskBadgeProps {
  level: "critical" | "warning" | "normal";
  score?: number;
  showIcon?: boolean;
  className?: string;
}

export function RiskBadge({
  level,
  score,
  showIcon = true,
  className,
}: RiskBadgeProps) {
  if (level === "critical") {
    return (
      <Badge variant="destructive" className={className}>
        {showIcon && <AlertCircle className="h-3 w-3" />}
        Risco Crítico {score ? `(${score}pts)` : ""}
      </Badge>
    );
  }

  if (level === "warning") {
    return (
      <Badge variant="warning" className={className}>
        {showIcon && <AlertTriangle className="h-3 w-3" />}
        Atenção {score ? `(${score}pts)` : ""}
      </Badge>
    );
  }

  return (
    <Badge variant="success" className={className}>
      {showIcon && <CheckCircle2 className="h-3 w-3" />}
      Normal
    </Badge>
  );
}
