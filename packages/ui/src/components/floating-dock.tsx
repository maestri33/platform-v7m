"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { IconLayoutNavbarCollapse } from "@tabler/icons-react";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

export interface FloatingDockItem {
  title: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export interface FloatingDockProps {
  items: FloatingDockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
  className?: string;
}

export function FloatingDock({
  items,
  desktopClassName,
  mobileClassName,
  className,
}: FloatingDockProps) {
  return (
    <div className={cn("pointer-events-none fixed inset-x-0 bottom-4 z-50 flex items-center justify-center px-4", className)}>
      <FloatingDockDesktop items={items} className={cn("pointer-events-auto", desktopClassName)} />
      <FloatingDockMobile items={items} className={cn("pointer-events-auto", mobileClassName)} />
    </div>
  );
}

export function FloatingDockMobile({
  items,
  className,
}: {
  items: FloatingDockItem[];
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="floating-dock-mobile-nav"
            className="absolute inset-x-0 bottom-full mb-3 flex flex-col items-center gap-2"
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title + item.href}
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  scale: 0.8,
                  transition: {
                    delay: idx * 0.03,
                  },
                }}
                transition={{ delay: (items.length - 1 - idx) * 0.04 }}
              >
                <a
                  href={item.href}
                  onClick={(e) => {
                    item.onClick?.(e);
                    setOpen(false);
                  }}
                  aria-label={item.title}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-700 shadow-lg backdrop-blur-md transition-colors hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-900/95 dark:text-neutral-200",
                    item.active &&
                      "border-brand-blue bg-brand-blue text-white shadow-brand-blue/30 dark:border-brand-blue dark:bg-brand-blue dark:text-white"
                  )}
                >
                  <div className="h-5 w-5">{item.icon}</div>
                </a>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Alternar menu dock"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-700 shadow-xl backdrop-blur-md transition hover:scale-105 active:scale-95 dark:border-neutral-800 dark:bg-neutral-900/90 dark:text-neutral-200"
      >
        <IconLayoutNavbarCollapse className="h-6 w-6 text-slate-700 dark:text-neutral-200" />
      </button>
    </div>
  );
}

export function FloatingDockDesktop({
  items,
  className,
}: {
  items: FloatingDockItem[];
  className?: string;
}) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.nav
      aria-label="Dock de navegação da role"
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto hidden h-16 items-end gap-3 rounded-2xl border border-slate-200/80 bg-white/85 px-4 pb-3 shadow-2xl backdrop-blur-xl md:flex dark:border-neutral-800/80 dark:bg-neutral-900/85",
        className
      )}
    >
      {items.map((item) => (
        <DockIconContainer mouseX={mouseX} key={item.title + item.href} {...item} />
      ))}
    </motion.nav>
  );
}

function DockIconContainer({
  mouseX,
  title,
  icon,
  href,
  active,
  onClick,
}: FloatingDockItem & {
  mouseX: MotionValue<number>;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 72, 40]);
  const heightTransformIcon = useTransform(distance, [-150, 0, 150], [20, 36, 20]);
  const widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 36, 20]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 72, 40]);

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = React.useState(false);

  return (
    <a
      href={href}
      onClick={onClick}
      aria-label={title}
      className="relative focus:outline-none"
    >
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "relative flex aspect-square items-center justify-center rounded-full border border-slate-200/60 bg-slate-100/90 text-slate-700 shadow-sm transition-colors hover:bg-slate-200/90 dark:border-neutral-700 dark:bg-neutral-800/90 dark:text-neutral-200 dark:hover:bg-neutral-700",
          active &&
            "border-brand-blue bg-brand-blue text-white shadow-md shadow-brand-blue/30 hover:bg-brand-blue dark:border-brand-blue dark:bg-brand-blue dark:text-white"
        )}
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 2, x: "-50%" }}
              className="pointer-events-none absolute -top-8 left-1/2 w-fit rounded-md border border-slate-200 bg-slate-900/95 px-2 py-0.5 text-[11px] font-medium whitespace-pre text-white shadow-md backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-white"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          style={{ width: widthIcon, height: heightIcon }}
          className="flex items-center justify-center shrink-0"
        >
          {icon}
        </motion.div>

        {active && (
          <span className="absolute -bottom-1 h-1 w-2 rounded-full bg-brand-blue ring-2 ring-white dark:ring-neutral-900" />
        )}
      </motion.div>
    </a>
  );
}
