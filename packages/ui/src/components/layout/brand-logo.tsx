import React from "react";

export type BrandVariant = "supletivo" | "promotor" | "group";
export type LogoThemeVariant = "light" | "dark";

export interface BrandLogoProps {
  brand?: BrandVariant;
  variant?: LogoThemeVariant;
  withLink?: boolean;
  href?: string;
  className?: string;
  title?: string;
}

export function BrandLogo({
  brand = "supletivo",
  variant = "light",
  withLink = true,
  href = "/",
  className = "",
  title,
}: BrandLogoProps) {
  const isLight = variant === "light";
  const textColor = isLight ? "text-white" : "text-brand-ink";
  const strokeColor = isLight ? "#ffffff" : "#009c3b";
  const yellowColor = "var(--color-yellow, #ffdf00)";

  const renderContent = () => {
    switch (brand) {
      case "promotor":
        return (
          <>
            <div className="relative flex items-center justify-center">
              <svg
                className="shrink-0 drop-shadow-[0_0_8px_rgba(217,177,90,0.3)]"
                viewBox="0 0 48 48"
                width="32"
                height="32"
                aria-hidden="true"
                fill="none"
              >
                <path
                  d="M24 4.5 43.5 24 24 43.5 4.5 24Z"
                  stroke="url(#promotor-gold-grad)"
                  strokeWidth="3.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M24 15v18M15 24h18"
                  stroke="#ffffff"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="promotor-gold-grad" x1="4.5" y1="4.5" x2="43.5" y2="43.5" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#f4dca0" />
                    <stop offset="0.5" stopColor="#d9b15a" />
                    <stop offset="1" stopColor="#a87b2e" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`font-black tracking-tight text-[1.2rem] leading-none whitespace-nowrap ${textColor}`}
                style={{ fontFamily: "var(--font-display, inherit)", color: isLight ? "#ffffff" : undefined }}
              >
                V<span className="text-[#f4dca0]">7</span>M
              </span>
              <span
                className="text-[0.62rem] font-bold tracking-[0.14em] uppercase px-2 py-0.5 rounded-full border leading-tight whitespace-nowrap"
                style={{
                  color: "#fcd34d",
                  borderColor: "rgba(251, 191, 36, 0.4)",
                  backgroundColor: "rgba(251, 191, 36, 0.12)",
                }}
              >
                Promotores
              </span>
            </div>
          </>
        );

      case "group":
        return (
          <>
            <div className="relative flex items-center justify-center">
              <svg
                className="shrink-0 drop-shadow-[0_0_6px_rgba(217,177,90,0.25)]"
                viewBox="0 0 48 48"
                width="32"
                height="32"
                aria-hidden="true"
                fill="none"
              >
                <path
                  d="M24 4.5 43.5 24 24 43.5 4.5 24Z"
                  stroke="url(#group-gold-grad)"
                  strokeWidth="3.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M24 15v18M15 24h18"
                  stroke={strokeColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="group-gold-grad" x1="4.5" y1="4.5" x2="43.5" y2="43.5" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#f4dca0" />
                    <stop offset="0.5" stopColor="#d9b15a" />
                    <stop offset="1" stopColor="#a87b2e" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`font-black tracking-tight text-[1.2rem] leading-none whitespace-nowrap ${textColor}`}
                style={{ fontFamily: "var(--font-display, inherit)", color: isLight ? "#ffffff" : undefined }}
              >
                Maestri.group
              </span>
              <span
                className="text-[0.62rem] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border leading-tight whitespace-nowrap"
                style={{
                  color: "#cbd5e1",
                  borderColor: "rgba(255, 255, 255, 0.25)",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                }}
              >
                Holding
              </span>
            </div>
          </>
        );

      case "supletivo":
      default:
        return (
          <>
            <div className="relative flex items-center justify-center">
              <svg
                className="shrink-0 drop-shadow-[0_0_8px_rgba(255,196,0,0.3)]"
                viewBox="0 0 48 48"
                width="32"
                height="32"
                aria-hidden="true"
                fill="none"
              >
                <path
                  d="M24 4.5 43.5 24 24 43.5 4.5 24Z"
                  stroke="url(#supletivo-gold-grad)"
                  strokeWidth="3.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 24.6l5.6 5.6L32 19.4"
                  stroke="#ffffff"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="supletivo-gold-grad" x1="4.5" y1="4.5" x2="43.5" y2="43.5" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ffe600" />
                    <stop offset="1" stopColor="#ffb300" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span
              className={`font-black tracking-tight text-[1.2rem] leading-none whitespace-nowrap ${textColor}`}
              style={{ fontFamily: "var(--font-display, inherit)" }}
            >
              Supletivo{" "}
              <span className="text-yellow-400">
                Brasil
              </span>
            </span>
          </>
        );
    }
  };

  const defaultTitle =
    brand === "promotor"
      ? "Maestri.group Promotores — Início"
      : brand === "group"
      ? "Maestri.group Portal de Gestão"
      : "Supletivo Brasil — Início";

  const wrapperClasses = `inline-flex items-center gap-2.5 no-underline transition-opacity hover:opacity-90 ${className}`;

  if (withLink) {
    return (
      <a href={href} className={wrapperClasses} aria-label={title || defaultTitle}>
        {renderContent()}
      </a>
    );
  }

  return <span className={wrapperClasses}>{renderContent()}</span>;
}
