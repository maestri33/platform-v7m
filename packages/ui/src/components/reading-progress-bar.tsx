"use client";

import * as React from "react";
import styles from "./reading-progress-bar.module.css";

export interface ReadingProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual brand identity. Defaults to 'auto'. */
  brand?: "supletivo" | "promotor" | "group" | "auto";
  /** Height token. Defaults to 'md' (4px). */
  size?: "xs" | "sm" | "md" | "lg";
  /** Positioning edge. Defaults to 'top'. */
  placement?: "top" | "bottom";
  /** Whether to render the specular glowing head. Defaults to true. */
  glow?: boolean;
  /** Custom z-index override. Defaults to 60. */
  zIndex?: number;
  /** Custom top offset (e.g. underneath sticky navbar). */
  topOffset?: string | number;
  /** Optional container reference for non-window scroll tracking. */
  targetRef?: React.RefObject<HTMLElement | null>;
}

const BRAND_CLASSES = {
  supletivo: styles.brandSupletivo,
  promotor: styles.brandPromotor,
  group: styles.brandGroup,
  auto: styles.brandAuto,
} as const;

const SIZE_CLASSES = {
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
} as const;

export function ReadingProgressBar({
  brand = "auto",
  size = "md",
  placement = "top",
  glow = true,
  zIndex = 60,
  topOffset,
  targetRef,
  className = "",
  style,
  ...rest
}: ReadingProgressBarProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    // Zero-cost check: exit immediately if browser natively supports CSS Scroll-Driven Animations
    if (
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("animation-timeline", "scroll()")
    ) {
      return;
    }

    let ticking = false;
    let cachedMax = 1;
    const target = targetRef?.current || window;

    const updateMetrics = () => {
      if (target === window) {
        const doc = document.documentElement;
        cachedMax = Math.max(1, doc.scrollHeight - window.innerHeight);
      } else {
        const container = target as HTMLElement;
        cachedMax = Math.max(1, container.scrollHeight - container.clientHeight);
      }
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          const currentScroll =
            target === window
              ? window.scrollY || document.documentElement.scrollTop
              : (target as HTMLElement).scrollTop;
          const ratio = Math.min(1, Math.max(0, currentScroll / cachedMax));
          el.style.setProperty("--progress-scale", ratio.toFixed(4));
          ticking = false;
        });
      }
    };

    updateMetrics();
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateMetrics, { passive: true });

    const ro = new ResizeObserver(updateMetrics);
    ro.observe(document.documentElement);

    return () => {
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateMetrics);
      ro.disconnect();
    };
  }, [targetRef]);

  const customStyle: React.CSSProperties = {
    ...style,
    "--rpb-z-index": zIndex,
    ...(topOffset != null
      ? { "--rpb-top-offset": typeof topOffset === "number" ? `${topOffset}px` : topOffset }
      : {}),
  } as React.CSSProperties;

  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      role="presentation"
      className={`${styles.track} ${BRAND_CLASSES[brand]} ${SIZE_CLASSES[size]} ${
        placement === "bottom" ? styles.trackBottom : ""
      } ${className}`}
      style={customStyle}
      {...rest}
    >
      <div className={styles.bar} />
      {glow && <div className={styles.bead} />}
    </div>
  );
}
