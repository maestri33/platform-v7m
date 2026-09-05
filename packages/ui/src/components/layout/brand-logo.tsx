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
            <svg
              className="shrink-0"
              viewBox="0 0 48 48"
              width="34"
              height="34"
              aria-hidden="true"
              fill="none"
            >
              <path
                d="M24 3.5 44.5 24 24 44.5 3.5 24Z"
                stroke={yellowColor}
                strokeWidth="3.6"
                strokeLinejoin="round"
              />
              <path
                d="M24 15v18M15 24h18"
                stroke={strokeColor}
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <span
              className={`font-black tracking-tight text-[1.1rem] leading-none whitespace-nowrap ${textColor}`}
              style={{ fontFamily: "var(--font-display, inherit)" }}
            >
              V<b style={{ color: yellowColor }}>7</b>M
            </span>
            <span
              className="text-[0.62rem] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full leading-normal whitespace-nowrap"
              style={{
                backgroundColor: yellowColor,
                color: "var(--color-ink, #0b1b3b)",
              }}
            >
              PROMOTORES
            </span>
          </>
        );

      case "group":
        return (
          <>
            <svg
              className="shrink-0"
              viewBox="0 0 48 48"
              width="32"
              height="32"
              aria-hidden="true"
              fill="none"
            >
              <path
                d="M24 3.5 44.5 24 24 44.5 3.5 24Z"
                stroke={yellowColor}
                strokeWidth="3.6"
                strokeLinejoin="round"
              />
              <path
                d="M24 15v18M15 24h18"
                stroke={strokeColor}
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <div className="flex flex-col">
              <span
                className={`font-black tracking-tight text-[1.1rem] leading-none flex items-center gap-1 ${textColor}`}
                style={{ fontFamily: "var(--font-display, inherit)" }}
              >
                V7M
                <span className="text-xs font-semibold text-emerald-400 tracking-normal">
                  Gestão
                </span>
              </span>
            </div>
          </>
        );

      case "supletivo":
      default:
        return (
          <>
            <svg
              className="shrink-0"
              viewBox="0 0 48 48"
              width="34"
              height="34"
              aria-hidden="true"
              fill="none"
            >
              <path
                d="M24 3.5 44.5 24 24 44.5 3.5 24Z"
                stroke={yellowColor}
                strokeWidth="3.6"
                strokeLinejoin="round"
              />
              <path
                d="M16 24.6l5.6 5.6L32 19.4"
                stroke={strokeColor}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className={`font-black tracking-tight text-[1.1rem] leading-none whitespace-nowrap ${textColor}`}
              style={{ fontFamily: "var(--font-display, inherit)" }}
            >
              Supletivo{" "}
              <b className={isLight ? "text-yellow-400" : "text-emerald-600"}>
                Brasil
              </b>
            </span>
          </>
        );
    }
  };

  const defaultTitle =
    brand === "promotor"
      ? "V7M Promotores — Início"
      : brand === "group"
      ? "V7M Portal de Gestão"
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
