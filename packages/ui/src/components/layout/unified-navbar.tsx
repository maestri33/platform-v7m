import React from "react";
import styles from "./layout.module.css";
import { BrandLogo, type BrandVariant } from "./brand-logo";
import { BrandRule } from "../brand-accents";

export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
  badge?: string;
  className?: string;
}

export type LayoutContext = "landing" | "portal" | "minimal";
export type NavbarTheme = "dark" | "glass" | "light";

export interface UnifiedNavbarProps {
  brand?: BrandVariant;
  context?: LayoutContext;
  theme?: NavbarTheme;
  position?: "sticky" | "absolute" | "fixed";
  items?: NavItem[];
  rightAction?: React.ReactNode;
  leftSlot?: React.ReactNode;
  homeHref?: string;
  showBrandRule?: boolean;
  className?: string;
  navAriaLabel?: string;
}

const DEFAULT_LANDING_ITEMS: Record<BrandVariant, NavItem[]> = {
  supletivo: [
    { label: "Como funciona", href: "#como-funciona" },
    { label: "Preço", href: "#preco" },
    { label: "Dúvidas", href: "#faq" },
  ],
  promotor: [
    { label: "Como funciona", href: "#como-funciona" },
    { label: "Ganhos", href: "#ganhos" },
    { label: "Como entrar", href: "#caminho" },
    { label: "Dúvidas", href: "#faq" },
  ],
  group: [
    { label: "Início", href: "/" },
  ],
};

export function UnifiedNavbar({
  brand = "supletivo",
  context = "landing",
  theme,
  position,
  items,
  rightAction,
  leftSlot,
  homeHref = "/",
  showBrandRule,
  className = "",
  navAriaLabel = "Seções da página",
}: UnifiedNavbarProps) {
  const actualTheme = theme ?? "glass";
  const actualPosition = position ?? "sticky";
  const shouldShowRule = showBrandRule ?? (context === "portal");

  const posClass =
    actualPosition === "sticky"
      ? styles.navbarSticky
      : actualPosition === "fixed"
      ? "fixed"
      : styles.navbarAbsolute;

  const themeClass =
    actualTheme === "glass"
      ? styles.navbarGlass
      : actualTheme === "light"
      ? styles.navbarLight
      : styles.navbarDark;

  const navItems = items ?? (context === "landing" ? DEFAULT_LANDING_ITEMS[brand] : []);

  const defaultCta =
    context === "landing" ? (
      brand === "promotor" ? (
        <a href="#caminho" className={`${styles.navCta} ${styles.navCtaPromotor}`}>
          <span>Quero ser promotor</span>
          <span aria-hidden="true">→</span>
        </a>
      ) : brand === "supletivo" ? (
        <a href="#preco" className={`${styles.navCta} ${styles.navCtaSupletivo}`}>
          <span>Quero meu diploma</span>
          <span aria-hidden="true">→</span>
        </a>
      ) : null
    ) : null;

  const resolvedRightAction = rightAction ?? defaultCta;

  return (
    <header className={`${styles.navbar} ${posClass} ${themeClass} ${className}`}>
      {shouldShowRule && <BrandRule placement="bottom" />}
      <div className={styles.navbarContainer}>
        <div className="flex items-center gap-3">
          {leftSlot}
          <BrandLogo
            brand={brand}
            variant={actualTheme === "light" ? "dark" : "light"}
            href={homeHref}
          />
        </div>

        {navItems.length > 0 && (
          <nav className={styles.navLinks} aria-label={navAriaLabel}>
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${item.className || ""}`}
                {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {item.label}
                {item.badge && (
                  <span className="ml-1.5 rounded-full bg-yellow-400/20 px-1.5 py-0.2 text-[10px] text-yellow-300">
                    {item.badge}
                  </span>
                )}
              </a>
            ))}
          </nav>
        )}

        {resolvedRightAction ? (
          <div className="flex items-center gap-3">{resolvedRightAction}</div>
        ) : null}
      </div>
    </header>
  );
}
