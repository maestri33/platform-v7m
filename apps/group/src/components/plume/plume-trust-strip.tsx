import React from "react";
import { Globe2, Box, Zap, Leaf, Gem } from "lucide-react";

export function PlumeTrustStrip() {
  const logos = [
    { name: "Orbit", icon: Globe2 },
    { name: "Stackly", icon: Box },
    { name: "Boltline", icon: Zap },
    { name: "Fernly", icon: Leaf },
    { name: "Prism", icon: Gem },
  ];

  return (
    <section className="w-full border-y border-sky-100 bg-white py-10 transition-colors">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="font-nunito text-center text-xs font-black tracking-[0.2em] text-ink-500/80 uppercase">
          Loved by teams at
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-8 sm:gap-14 lg:gap-20">
          {logos.map((logo) => {
            const Icon = logo.icon;
            return (
              <div
                key={logo.name}
                className="group flex items-center gap-2.5 opacity-70 transition-all duration-200 hover:opacity-100"
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-sky-50 text-ink-700 transition group-hover:bg-sky-100 group-hover:text-sky-600">
                  <Icon className="size-4" strokeWidth={2.5} />
                </div>
                <span className="font-nunito text-lg font-black tracking-tight text-ink-900">
                  {logo.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
