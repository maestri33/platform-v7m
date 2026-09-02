import React from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";

export function PlumeHeroPitch() {
  return (
    <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
      {/* Pill Badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/90 px-4 py-1.5 shadow-sm backdrop-blur transition hover:border-sky-200">
        <Sparkles className="size-4 text-coral-500" strokeWidth={2.5} />
        <span className="font-nunito text-xs font-bold text-ink-700 sm:text-sm">
          Now with one-prompt page generation
        </span>
      </div>

      {/* Main Headline */}
      <h1 className="font-nunito mt-6 text-4xl font-black leading-[1.08] tracking-tight text-ink-900 sm:text-5xl lg:text-6xl">
        Design what you&apos;re{" "}
        <span className="text-sky-500">imagining</span>, in plain{" "}
        <span className="relative inline-block">
          words
          {/* Hand-drawn coral SVG underline swoosh */}
          <svg
            className="absolute -bottom-2.5 left-0 w-full overflow-visible text-coral-400"
            viewBox="0 0 120 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M3 11.5C28 4.2 82 2.8 116 11C88 6.5 42 7.2 16 14"
              stroke="currentColor"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        .
      </h1>

      {/* Subhead */}
      <p className="font-nunito mt-6 max-w-xl text-lg font-normal leading-relaxed text-ink-500 sm:text-xl">
        Meet Plume, the conversational interface designer that turns product intentions, wireframes, and design specs into production-ready front-end screens in seconds.
      </p>

      {/* 3-up Check-circle Feature Ticks */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:justify-start">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-sky-400" strokeWidth={2.5} />
          <span className="font-nunito text-sm font-bold text-ink-700 sm:text-base">
            Free to start
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-sky-400" strokeWidth={2.5} />
          <span className="font-nunito text-sm font-bold text-ink-700 sm:text-base">
            No card needed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-sky-400" strokeWidth={2.5} />
          <span className="font-nunito text-sm font-bold text-ink-700 sm:text-base">
            Export to code
          </span>
        </div>
      </div>

      {/* Social Proof Row */}
      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:items-center">
        {/* 4 Overlapping 40px gradient avatars */}
        <div className="flex -space-x-3">
          <div className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-sky-400 to-sky-600 font-nunito text-xs font-bold text-white shadow-sm">
            AL
          </div>
          <div className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-coral-400 to-coral-600 font-nunito text-xs font-bold text-white shadow-sm">
            MK
          </div>
          <div className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-sky-300 to-coral-400 font-nunito text-xs font-bold text-white shadow-sm">
            ST
          </div>
          <div className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-ink-900 font-nunito text-xs font-extrabold text-white shadow-sm">
            +9k
          </div>
        </div>
        <p className="font-nunito text-sm font-bold text-ink-700 sm:text-[15px]">
          Builders shipping UI with Plume every week.
        </p>
      </div>
    </div>
  );
}
