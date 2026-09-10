import * as React from "react";
import styles from "./sticky-cta.module.css";

export type StickyCtaBrand = "supletivo" | "promotor" | "group" | "default";

export interface StickyCtaProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Brand identity variant. Defaults to 'default'. */
  brand?: StickyCtaBrand;
  /** Primary headline or price (e.g. '12x de R$ 97,90' or 'R$ 150 / indicação'). */
  title: React.ReactNode;
  /** Reassurance microcopy (e.g. 'garantia de 7 dias' or 'no Pix toda semana'). */
  subtitle?: React.ReactNode;
  /** CTA Button text label. */
  ctaLabel: string;
  /** Target href URL. */
  ctaHref: string;
  /** Accessible label for screen readers. */
  ariaLabel?: string;
  /** Value for data-cta attribute (default: 'sticky'). */
  ctaPosition?: string;
  /** Micro-interaction style on appearance. Defaults to 'shimmer'. */
  pulse?: "shimmer" | "none";
  /** Show directional trailing arrow icon. Defaults to true. */
  showArrow?: boolean;
  /** Selector for the hero section to observe. Defaults to '#hero, [data-sticky-hero]'. */
  heroSelector?: string;
  /** Selector for inline CTAs to avoid covering. Defaults to 'a[data-cta]:not([data-cta="sticky"])'. */
  inlineCtaSelector?: string;
  /** Automatically coordinate bottom body padding. Defaults to true. */
  padBody?: boolean;
  /** Optional click handler. */
  onCtaClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const BRAND_CLASSES: Record<StickyCtaBrand, string> = {
  supletivo: styles.brandSupletivo,
  promotor: styles.brandPromotor,
  group: styles.brandGroup,
  default: styles.brandDefault,
};

/**
 * Polymorphic StickyCta Component
 * High-converting, accessible mobile floating action sheet with
 * glassmorphism, brand-adaptive styling, and intelligent double-gated visibility.
 */
export function StickyCta({
  brand = "default",
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  ariaLabel,
  ctaPosition = "sticky",
  pulse = "shimmer",
  showArrow = true,
  heroSelector = "#hero, [data-sticky-hero]",
  inlineCtaSelector = 'a[data-cta]:not([data-cta="sticky"])',
  padBody = true,
  onCtaClick,
  className = "",
  style,
  ...rest
}: StickyCtaProps) {
  const containerRef = React.useRef<HTMLElement>(null);
  const brandClass = BRAND_CLASSES[brand] || styles.brandDefault;
  const computedAriaLabel =
    ariaLabel || (typeof title === "string" ? `${ctaLabel} — ${title}` : ctaLabel);

  // Client-side React effect (for Next.js / React apps)
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const el = containerRef.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      el.classList.add(styles.visible);
      if (padBody) document.body.classList.add("has-v7m-sticky-cta");
      return;
    }

    const hero = document.querySelector(heroSelector);
    const inlineCtas = document.querySelectorAll(inlineCtaSelector);
    const ctasOnScreen = new Set<Element>();
    let pastHero = !hero;

    const updateVisibility = () => {
      const show = pastHero && ctasOnScreen.size === 0;
      el.classList.toggle(styles.visible, show);

      if (padBody) {
        const isMobile = window.matchMedia("(max-width: 899px)").matches;
        document.body.classList.toggle("has-v7m-sticky-cta", show && isMobile);
        if (show) {
          const height = el.offsetHeight || 72;
          document.documentElement.style.setProperty("--v7m-sticky-height", `${height}px`);
        }
      }
    };

    let heroObserver: IntersectionObserver | null = null;
    if (hero) {
      heroObserver = new IntersectionObserver(
        ([entry]) => {
          pastHero = !entry.isIntersecting;
          updateVisibility();
        },
        { rootMargin: "-64px 0px 0px 0px" }
      );
      heroObserver.observe(hero);
    }

    const ctaObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            ctasOnScreen.add(entry.target);
          } else {
            ctasOnScreen.delete(entry.target);
          }
        }
        updateVisibility();
      },
      { threshold: 0.35 }
    );

    inlineCtas.forEach((cta) => ctaObserver.observe(cta));
    updateVisibility();

    const onResize = () => updateVisibility();
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      heroObserver?.disconnect();
      ctaObserver.disconnect();
      window.removeEventListener("resize", onResize);
      if (padBody) {
        document.body.classList.remove("has-v7m-sticky-cta");
      }
    };
  }, [heroSelector, inlineCtaSelector, padBody]);

  // Embedded runner for static SSR / Astro environments (0ms JS React overhead)
  const inlineScript = `
  (function() {
    if (typeof window === 'undefined') return;
    function initSticky() {
      var el = document.querySelector('[data-v7m-sticky-cta]');
      if (!el || el.dataset.v7mInit === 'true') return;
      el.dataset.v7mInit = 'true';

      var visibleClass = '${styles.visible}';
      if (!('IntersectionObserver' in window)) {
        el.classList.add(visibleClass);
        document.body.classList.add('has-v7m-sticky-cta');
        return;
      }

      var hero = document.querySelector('${heroSelector.replace(/'/g, "\\'")}');
      var inlineCtas = document.querySelectorAll('${inlineCtaSelector.replace(/'/g, "\\'")}');
      var ctasOnScreen = new Set();
      var pastHero = !hero;

      function update() {
        var show = pastHero && ctasOnScreen.size === 0;
        el.classList.toggle(visibleClass, show);
        var isMobile = window.matchMedia('(max-width: 899px)').matches;
        document.body.classList.toggle('has-v7m-sticky-cta', show && isMobile);
        if (show) {
          document.documentElement.style.setProperty('--v7m-sticky-height', (el.offsetHeight || 72) + 'px');
        }
      }

      if (hero) {
        new IntersectionObserver(function(entries) {
          pastHero = !entries[0].isIntersecting;
          update();
        }, { rootMargin: '-64px 0px 0px 0px' }).observe(hero);
      }

      var ctaIo = new IntersectionObserver(function(entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) ctasOnScreen.add(entries[i].target);
          else ctasOnScreen.delete(entries[i].target);
        }
        update();
      }, { threshold: 0.35 });

      for (var j = 0; j < inlineCtas.length; j++) {
        ctaIo.observe(inlineCtas[j]);
      }
      update();

      window.addEventListener('resize', update, { passive: true });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSticky);
    } else {
      initSticky();
    }
    document.addEventListener('astro:page-load', initSticky);
  })();
  `;

  return (
    <aside
      ref={containerRef}
      role="region"
      aria-label="Acesso rápido"
      data-v7m-sticky-cta
      className={`${styles.wrapper} sticky-cta ${brandClass} ${className}`.trim()}
      style={style}
      {...rest}
    >
      <div className={styles.inner}>
        <div className={`${styles.content} sticky-price`}>
          <strong className={styles.title}>{title}</strong>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>

        <a
          href={ctaHref}
          data-cta={ctaPosition}
          aria-label={computedAriaLabel}
          className={`${styles.btn} sticky-btn ${pulse === "shimmer" ? styles.shimmer : ""}`.trim()}
          onClick={onCtaClick}
        >
          <span>{ctaLabel}</span>
          {showArrow && (
            <svg
              className={styles.chevron}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </a>
      </div>
      <script dangerouslySetInnerHTML={{ __html: inlineScript }} />
    </aside>
  );
}
