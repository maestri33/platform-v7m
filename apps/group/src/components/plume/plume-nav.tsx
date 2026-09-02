"use client";

import React from "react";
import Link from "next/link";
import { Feather, ArrowRight } from "lucide-react";

export function PlumeNav() {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const focusAuth = () => {
    const emailInput = document.getElementById("work-email");
    if (emailInput) {
      emailInput.scrollIntoView({ behavior: "smooth", block: "center" });
      emailInput.focus();
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-sky-100 bg-white/75 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        {/* Brand Lockup */}
        <Link href="#hero" className="group flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-400 to-coral-400 shadow-sm transition-transform duration-200 group-hover:scale-105">
            <Feather className="size-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-nunito text-2xl font-black tracking-tight text-ink-900">
            Plume
          </span>
        </Link>

        {/* Center Nav Links (hidden on mobile) */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main Navigation">
          <button
            type="button"
            onClick={() => scrollToSection("features")}
            className="font-nunito text-[15px] font-bold text-ink-700 transition hover:text-sky-500"
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("prompt-library")}
            className="font-nunito text-[15px] font-bold text-ink-700 transition hover:text-sky-500"
          >
            Prompt library
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("showcase")}
            className="font-nunito text-[15px] font-bold text-ink-700 transition hover:text-sky-500"
          >
            Showcase
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("pricing")}
            className="font-nunito text-[15px] font-bold text-ink-700 transition hover:text-sky-500"
          >
            Pricing
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={focusAuth}
            className="font-nunito text-[15px] font-bold text-ink-700 transition hover:text-sky-500"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={focusAuth}
            className="group inline-flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 font-nunito text-sm font-black text-white shadow-sm transition duration-200 hover:bg-sky-500 active:scale-95"
          >
            <span>Start free</span>
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
