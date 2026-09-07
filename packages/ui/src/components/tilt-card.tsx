"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { cn } from "../lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TiltCardProps {
  children: React.ReactNode;
  /** Rotação máxima em graus na direção do cursor. Padrão: 8 */
  maxTilt?: number;
  /** Inverter direção do efeito de inclinação. Padrão: false */
  tiltReverse?: boolean;
  /** Escala ao passar o mouse. Padrão: 1.02 */
  scale?: number;
  /** Distância de perspectiva CSS em pixels. Padrão: 1000 */
  perspective?: number;
  /** Efeito de brilho especular (glare) que acompanha o ponteiro. Padrão: true */
  glare?: boolean;
  /** Cor do gradiente de brilho. Padrão: dourado/amarelo da marca ou customizável */
  glareColor?: string;
  /** Classes CSS para o wrapper externo */
  containerClassName?: string;
  /** Classes CSS para o corpo do card */
  className?: string;
}

export interface TiltCardItemProps {
  children: React.ReactNode;
  /** Elevação no eixo Z em pixels durante hover */
  depth?: number;
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TRACK_SPRING = {
  type: "spring",
  stiffness: 260,
  damping: 22,
  mass: 0.6,
} as const;

const RESET_SPRING = {
  type: "spring",
  stiffness: 140,
  damping: 18,
  mass: 1,
} as const;

const REST_POINT = 0.5;
const PRESS_SCALE = 0.99;

const TiltCardContext = createContext<{ hovered: boolean }>({ hovered: false });

// ─── Components ──────────────────────────────────────────────────────────────

export function TiltCard({
  children,
  maxTilt = 8,
  tiltReverse = false,
  scale = 1.02,
  perspective = 1000,
  glare = true,
  glareColor = "rgba(255, 196, 0, 0.22)",
  containerClassName,
  className,
}: TiltCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tiltX = useMotionValue(REST_POINT);
  const tiltY = useMotionValue(REST_POINT);
  const cardScale = useSpring(1, TRACK_SPRING);

  const tiltSign = tiltReverse ? -1 : 1;
  const rotateX = useTransform(
    tiltY,
    [0, 1],
    [maxTilt * tiltSign, -maxTilt * tiltSign]
  );
  const rotateY = useTransform(
    tiltX,
    [0, 1],
    [-maxTilt * tiltSign, maxTilt * tiltSign]
  );
  const glarePosX = useTransform(tiltX, (value) => value * 100);
  const glarePosY = useTransform(tiltY, (value) => value * 100);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glarePosX}% ${glarePosY}%, ${glareColor}, transparent 65%)`;

  useEffect(() => {
    return () => {
      tiltX.stop();
      tiltY.stop();
    };
  }, [tiltX, tiltY]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse" || shouldReduceMotion) return;
      const rect = event.currentTarget.getBoundingClientRect();
      animate(tiltX, (event.clientX - rect.left) / rect.width, TRACK_SPRING);
      animate(tiltY, (event.clientY - rect.top) / rect.height, TRACK_SPRING);
    },
    [tiltX, tiltY, shouldReduceMotion]
  );

  const handlePointerEnter = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse" || shouldReduceMotion) return;
      setHovered(true);
      cardScale.set(scale);
    },
    [cardScale, scale, shouldReduceMotion]
  );

  const handlePointerLeave = useCallback(() => {
    setHovered(false);
    cardScale.set(1);
    animate(tiltX, REST_POINT, RESET_SPRING);
    animate(tiltY, REST_POINT, RESET_SPRING);
  }, [cardScale, tiltX, tiltY]);

  const handlePointerDown = useCallback(() => {
    if (shouldReduceMotion) return;
    cardScale.set(PRESS_SCALE);
  }, [cardScale, shouldReduceMotion]);

  const handlePointerUp = useCallback(() => {
    cardScale.set(hovered ? scale : 1);
  }, [cardScale, hovered, scale]);

  const activeReducedMotion = !mounted || shouldReduceMotion;

  return (
    <div
      className={cn("relative w-full", containerClassName)}
      style={{ perspective: `${perspective}px` }}
    >
      <motion.div
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          rotateX: activeReducedMotion ? 0 : rotateX,
          rotateY: activeReducedMotion ? 0 : rotateY,
          scale: mounted ? cardScale : 1,
          transformStyle: "preserve-3d",
        }}
        className={cn("relative will-change-transform", className)}
      >
        <TiltCardContext.Provider value={{ hovered }}>
          <div style={{ transformStyle: "preserve-3d" }}>{children}</div>
        </TiltCardContext.Provider>

        {glare && mounted && !shouldReduceMotion && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden"
            style={{ background: glareBackground, transform: "translateZ(1px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        )}
      </motion.div>
    </div>
  );
}

export function TiltCardItem({
  children,
  depth = 0,
  className,
}: TiltCardItemProps) {
  const shouldReduceMotion = useReducedMotion();
  const { hovered } = useContext(TiltCardContext);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const lifted = mounted && hovered && !shouldReduceMotion;

  return (
    <div
      className={cn(
        "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none",
        className
      )}
      style={{
        transform: lifted ? `translateZ(${depth}px)` : "translateZ(0px)",
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </div>
  );
}
