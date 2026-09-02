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
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10.5px] font-mono font-medium rounded-full border border-white/20 bg-white/5 text-white/80 select-none shadow-sm ${className}`}
      title={`Plataforma V7M • Versão ${version}${env ? ` • Ambiente: ${env}` : ""}`}
      {...props}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-brand-green-light animate-pulse" />
      <span>v{version}</span>
      {showEnv && env && (
        <span className="opacity-60 border-l border-white/30 pl-1 uppercase tracking-wider text-[9px]">
          {env}
        </span>
      )}
    </div>
  );
}
