"use client";

import React from "react";
import { Feather, Sparkles } from "lucide-react";

export function PlumeCta() {
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
    <section id="pricing" className="relative w-full bg-cloud py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        {/* Big White Rounded-5xl Card */}
        <div className="relative overflow-hidden rounded-5xl bg-white p-10 sm:p-16 text-center shadow-card ring-1 ring-sky-100">
          {/* Two blurred pastel blobs inside */}
          <div
            className="ghost-blob animate-float-slow absolute -top-16 -left-16 size-80 rounded-full bg-sky-200/50 pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="ghost-blob animate-float-reverse absolute -bottom-16 -right-16 size-80 rounded-full bg-coral-300/40 pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-2xl">
            {/* Gradient feather icon tile */}
            <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-sky-500 to-coral-500 shadow-soft">
              <Feather className="size-8 text-white" strokeWidth={2.5} />
            </div>

            {/* Font-900 Headline */}
            <h2 className="font-nunito mt-8 text-3xl font-black tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
              Your next screen is one sentence away.
            </h2>

            {/* Muted Subhead */}
            <p className="font-nunito mt-4 text-lg font-normal leading-relaxed text-ink-500 sm:text-xl">
              Start free, no credit card required. Experience human-paced AI design collaboration that speaks fluent frontend.
            </p>

            {/* Two Pill Buttons */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
              <button
                type="button"
                onClick={focusAuth}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-700 to-coral-600 px-8 py-4 font-nunito text-base font-black text-white shadow-soft transition duration-200 hover:opacity-95 active:scale-95"
              >
                <span>Create your canvas</span>
                <Sparkles className="size-4" strokeWidth={2.5} />
              </button>

              <button
                type="button"
                onClick={() => {
                  const feat = document.getElementById("features");
                  if (feat) feat.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border-2 border-sky-100 bg-white px-8 py-4 font-nunito text-base font-black text-ink-900 shadow-xs transition duration-200 hover:border-sky-300 hover:bg-sky-50/50 active:scale-95"
              >
                See how it works
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
