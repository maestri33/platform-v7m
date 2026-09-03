"use client";

import * as React from "react";
import { IconArrowLeft, IconArrowRight, IconCheck, IconQuote } from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

export type Testimonial = {
  quote: string;
  name: string;
  designation: string;
  badge?: string;
  outcome?: string;
  src: string;
};

export const AnimatedTestimonials = ({
  testimonials,
  autoplay = false,
}: {
  testimonials: Testimonial[];
  autoplay?: boolean;
}) => {
  const [active, setActive] = useState(0);

  const handleNext = () => {
    setActive((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const isActive = (index: number) => {
    return index === active;
  };

  useEffect(() => {
    if (autoplay) {
      const interval = setInterval(handleNext, 6000);
      return () => clearInterval(interval);
    }
  }, [autoplay, testimonials.length]);

  const randomRotateY = (idx: number) => {
    const rotations = [-6, 6, -4, 4, -8, 8];
    return rotations[idx % rotations.length];
  };

  if (!testimonials || testimonials.length === 0) return null;

  const current = testimonials[active];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 font-sans antialiased md:px-8">
      <div className="relative grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16 items-center">
        {/* Coluna 1: Foto com Efeito Stack 3D */}
        <div className="flex flex-col items-center">
          <div className="relative h-80 sm:h-96 w-full max-w-sm mx-auto">
            <AnimatePresence mode="popLayout">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.src}
                  initial={{
                    opacity: 0,
                    scale: 0.9,
                    z: -100,
                    rotate: randomRotateY(index),
                  }}
                  animate={{
                    opacity: isActive(index) ? 1 : 0.6,
                    scale: isActive(index) ? 1 : 0.94,
                    z: isActive(index) ? 0 : -100,
                    rotate: isActive(index) ? 0 : randomRotateY(index),
                    zIndex: isActive(index) ? 30 : testimonials.length + 2 - index,
                    y: isActive(index) ? [0, -40, 0] : 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.88,
                    z: 100,
                    rotate: randomRotateY(index),
                  }}
                  transition={{
                    duration: 0.45,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="absolute inset-0 origin-bottom"
                >
                  <div className="relative h-full w-full rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-slate-950">
                    <img
                      src={testimonial.src}
                      alt={testimonial.name}
                      width={600}
                      height={600}
                      draggable={false}
                      className="h-full w-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    {testimonial.badge && (
                      <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md rounded-xl p-2.5 px-3.5 shadow-xl border border-white/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
                            <IconCheck className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                          <span className="text-xs font-bold text-white tracking-tight">
                            {testimonial.badge}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Verificado
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Dots de paginação */}
          <div className="flex items-center gap-2 mt-6">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActive(idx)}
                aria-label={`Ver história de ${testimonials[idx].name}`}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive(idx)
                    ? "w-8 bg-yellow-400"
                    : "w-2.5 bg-slate-700 hover:bg-slate-600"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Coluna 2: Conteúdo Textual com Storytelling */}
        <div className="flex flex-col justify-between py-2">
          <motion.div
            key={active}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -15, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {current.outcome && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 text-xs font-bold mb-4">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                {current.outcome}
              </div>
            )}

            <div className="flex items-start gap-3">
              <IconQuote className="h-8 w-8 text-yellow-400/50 shrink-0 mt-1 hidden sm:block" />
              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {current.name}
                </h3>
                <p className="text-sm font-semibold text-yellow-400/90 mt-1">
                  {current.designation}
                </p>
              </div>
            </div>

            <motion.p className="mt-6 text-base sm:text-lg leading-relaxed text-slate-200 italic border-l-2 border-yellow-400/40 pl-4 sm:pl-0 sm:border-l-0">
              "{current.quote.split(" ").map((word, index) => (
                <motion.span
                  key={index}
                  initial={{ filter: "blur(6px)", opacity: 0, y: 4 }}
                  animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.18,
                    ease: "easeOut",
                    delay: 0.012 * index,
                  }}
                  className="inline-block"
                >
                  {word}&nbsp;
                </motion.span>
              ))}"
            </motion.p>
          </motion.div>

          {/* Controles de Navegação */}
          <div className="flex items-center justify-between pt-8 border-t border-slate-800 mt-8">
            <div className="text-xs font-semibold text-slate-400">
              História <span className="text-white font-bold">{active + 1}</span> de{" "}
              {testimonials.length}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePrev}
                type="button"
                aria-label="Depoimento anterior"
                className="group flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/90 border border-slate-700 text-slate-200 hover:border-yellow-400 hover:text-yellow-400 hover:bg-slate-800 transition-all duration-200 shadow-md cursor-pointer active:scale-95"
              >
                <IconArrowLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
              </button>
              <button
                onClick={handleNext}
                type="button"
                aria-label="Próximo depoimento"
                className="group flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/90 border border-slate-700 text-slate-200 hover:border-yellow-400 hover:text-yellow-400 hover:bg-slate-800 transition-all duration-200 shadow-md cursor-pointer active:scale-95"
              >
                <IconArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
