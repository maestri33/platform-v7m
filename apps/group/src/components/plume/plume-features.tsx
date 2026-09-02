import React from "react";
import { Wand2, Infinity as InfinityIcon, Code2 } from "lucide-react";

export function PlumeFeatures() {
  const features = [
    {
      title: "Prompt to mockup",
      description:
        "Describe high-level flows, user permissions, or detailed layout components. Watch responsive React mockups emerge in real time.",
      icon: Wand2,
      tint: "sky", // sky icon tile
    },
    {
      title: "Infinite canvas",
      description:
        "Branch ideas, compare design iterations side by side, and test typography scales without ever losing your working state.",
      icon: InfinityIcon,
      tint: "coral", // coral icon tile
    },
    {
      title: "Export to code",
      description:
        "One-click copy to clean, semantic Tailwind CSS, Next.js, and TypeScript components tuned to your production architecture.",
      icon: Code2,
      tint: "sky", // sky icon tile
    },
  ];

  return (
    <section id="features" className="relative w-full bg-cloud py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Left-aligned Header */}
        <div className="max-w-2xl text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-1.5 shadow-xs">
            <span className="font-nunito text-xs font-black uppercase tracking-wider text-sky-700">
              Why builders pick Plume
            </span>
          </div>

          <h2 className="font-nunito mt-4 text-3xl font-black tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
            A design partner that actually keeps up.
          </h2>

          <p className="font-nunito mt-4 text-lg font-normal leading-relaxed text-ink-500">
            Ditch slow handoffs and pixel nudging. Plume combines stateful intelligence with atomic design tokens so you can ship front-end features in minutes.
          </p>
        </div>

        {/* 3-Column Grid */}
        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          {features.map((item) => {
            const Icon = item.icon;
            const isCoral = item.tint === "coral";

            return (
              <div
                key={item.title}
                className="group relative flex flex-col justify-between rounded-4xl bg-white p-8 sm:p-10 shadow-soft ring-1 ring-sky-100 transition-all duration-300 hover:-translate-y-2 hover:shadow-card"
              >
                <div>
                  {/* 14x14 rounded-3xl tinted icon tile (56px) */}
                  <div
                    className={`flex size-14 items-center justify-center rounded-3xl transition-all duration-300 ${
                      isCoral
                        ? "bg-coral-50 text-coral-500 group-hover:bg-coral-500 group-hover:text-white"
                        : "bg-sky-50 text-sky-500 group-hover:bg-sky-500 group-hover:text-white"
                    }`}
                  >
                    <Icon className="size-7 transition-transform duration-300 group-hover:scale-110" strokeWidth={2.2} />
                  </div>

                  {/* Title */}
                  <h3 className="font-nunito mt-6 text-2xl font-black text-ink-900 tracking-tight">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="font-nunito mt-3 text-base leading-relaxed text-ink-500">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
