"use client";

import React from "react";
import { IconAppWindow } from "@tabler/icons-react";
import { BackgroundGradient } from "./background-gradient";

/**
 * BackgroundGradientDemo (Aceternity / Tabler Icons).
 *
 * Demonstração canônica do BackgroundGradient com IconAppWindow do @tabler/icons-react.
 */
export function BackgroundGradientDemo() {
  return (
    <div className="flex justify-center p-4">
      <BackgroundGradient className="rounded-[22px] max-w-sm p-4 sm:p-10 bg-white dark:bg-zinc-900 shadow-xl border border-slate-100 dark:border-zinc-800">
        <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 p-8 dark:from-zinc-800 dark:to-zinc-900 text-slate-700 dark:text-zinc-200">
          <IconAppWindow className="size-20 text-brand-blue dark:text-blue-400" />
        </div>

        <p className="text-base sm:text-xl font-bold text-black mt-4 mb-2 dark:text-neutral-200">
          Air Jordan 4 Retro Reimagined
        </p>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          The Air Jordan 4 Retro Reimagined Bred will release on Saturday,
          February 17, 2024. Your best opportunity to get these right now is by
          entering raffles and waiting for the official releases.
        </p>

        <button className="rounded-full pl-4 pr-1 py-1 text-white flex items-center space-x-1 bg-black mt-4 text-xs font-bold dark:bg-zinc-800 transition hover:bg-slate-800">
          <span>Buy now </span>
          <span className="bg-zinc-700 rounded-full text-[0.6rem] px-2 py-0 text-white">
            $100
          </span>
        </button>
      </BackgroundGradient>
    </div>
  );
}
