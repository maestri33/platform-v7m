import * as React from "react";

export interface VersionBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  version?: string;
  env?: string;
  showEnv?: boolean;
}

export function VersionBadge({
  version = "0.1.0-alpha.1",
  env,
  showEnv = false,
  className = "",
  ...props
}: VersionBadgeProps) {
  const isAlpha = version.includes("alpha");
  const isBeta = version.includes("beta");
  const isRc = version.includes("rc");

  const badgeColor = isAlpha
    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
    : isBeta
    ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
    : isRc
    ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-medium rounded-full border ${badgeColor} select-none ${className}`}
      title={`Plataforma V7M • Versão ${version}${env ? ` • Ambiente: ${env}` : ""}`}
      {...props}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 animate-pulse" />
      <span>v{version}</span>
      {showEnv && env && (
        <span className="opacity-60 border-l border-current/30 pl-1 uppercase tracking-wider text-[9px]">
          {env}
        </span>
      )}
    </div>
  );
}
