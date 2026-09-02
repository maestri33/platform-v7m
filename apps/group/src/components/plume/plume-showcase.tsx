import React from "react";
import { ArrowUpRight, BarChart3, LockKeyhole, ShoppingCart, MessageSquare } from "lucide-react";

export function PlumeShowcase() {
  const promptCards = [
    {
      title: "Analytics dashboard",
      remixes: "1,420 remixes",
      icon: BarChart3,
      tint: "bg-sky-50 text-sky-600",
      offset: "",
      anim: "animate-float-slow",
    },
    {
      title: "Friendly login",
      remixes: "890 remixes",
      icon: LockKeyhole,
      tint: "bg-coral-50 text-coral-500",
      offset: "sm:mt-8",
      anim: "animate-float-reverse",
    },
    {
      title: "Checkout flow",
      remixes: "640 remixes",
      icon: ShoppingCart,
      tint: "bg-sky-50 text-sky-600",
      offset: "",
      anim: "animate-float-reverse",
    },
    {
      title: "Onboarding chat",
      remixes: "1,150 remixes",
      icon: MessageSquare,
      tint: "bg-coral-50 text-coral-500",
      offset: "sm:mt-8",
      anim: "animate-float-slow",
    },
  ];

  return (
    <section
      id="prompt-library"
      className="relative w-full overflow-hidden bg-gradient-to-r from-sky-700 via-sky-700 to-coral-600 py-24 text-white"
    >
      {/* Faint dot grid overlay */}
      <div className="dotgrid-white absolute inset-0 opacity-25 pointer-events-none" aria-hidden="true" />

      {/* Floating ambient white blob */}
      <div
        className="ghost-blob animate-float-slow absolute -top-24 right-1/4 size-96 rounded-full bg-white/20 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Column */}
          <div className="flex flex-col items-start text-left">
            {/* Translucent pill badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-md shadow-xs">
              <span className="font-nunito text-xs font-black uppercase tracking-wider text-white">
                Prompt library
              </span>
            </div>

            {/* Headline */}
            <h2 className="font-nunito mt-6 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Start from something worth sharing.
            </h2>

            {/* Paragraph */}
            <p className="font-nunito mt-5 max-w-lg text-lg font-normal leading-relaxed text-white/90">
              Browse hundreds of battle-tested prompt recipes, modular flows, and curated UI kits built by top product designers across the community.
            </p>

            {/* White Pill CTA */}
            <button
              type="button"
              className="group mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-nunito text-sm font-black text-ink-900 shadow-lift transition duration-200 hover:bg-sky-50 active:scale-95"
            >
              <span>Explore the library</span>
              <ArrowUpRight className="size-4 text-ink-900 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Right Column: 2x2 Staggered Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {promptCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className={`group relative rounded-3xl bg-white p-6 text-ink-900 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift ${card.offset} ${card.anim}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Tinted rounded-2xl icon tile */}
                    <div className={`flex size-12 items-center justify-center rounded-2xl ${card.tint}`}>
                      <Icon className="size-6" strokeWidth={2.2} />
                    </div>
                    <div>
                      <h3 className="font-nunito text-base font-black text-ink-900">
                        {card.title}
                      </h3>
                      <p className="font-nunito mt-0.5 text-xs font-bold text-ink-500">
                        {card.remixes}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
