import React, { Suspense } from "react";
import { Metadata } from "next";

import { LoadingState } from "@/components/ui/spinner";
import { PlumeNav } from "@/components/plume/plume-nav";
import { PlumeAmbient } from "@/components/plume/plume-ambient";
import { PlumeHeroPitch } from "@/components/plume/plume-hero-pitch";
import { PlumeTrustStrip } from "@/components/plume/plume-trust-strip";
import { PlumeFeatures } from "@/components/plume/plume-features";
import { PlumeShowcase } from "@/components/plume/plume-showcase";
import { PlumeCta } from "@/components/plume/plume-cta";
import { PlumeFooter } from "@/components/plume/plume-footer";
import { LoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "Plume — Design what you're imagining, in plain words",
  description:
    "A friendly, rounded AI product-design agent that turns plain English descriptions into production-ready front-end screens.",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full bg-cloud font-nunito text-ink-900 selection:bg-sky-200 selection:text-ink-900">
      {/* 1. Sticky Frosted Header */}
      <PlumeNav />

      {/* Main Content Scroll */}
      <main id="conteudo">
        {/* 2. Full-Bleed Sky-Gradient Hero */}
        <section id="hero" className="relative w-full overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28">
          {/* Ambient Texture & Blobs */}
          <PlumeAmbient />

          {/* Centered Content Row */}
          <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
              {/* Left Column: Product Pitch */}
              <PlumeHeroPitch />

              {/* Right Column: Two-Panel Sign-In Card */}
              <div className="w-full">
                <Suspense
                  fallback={
                    <div className="flex h-96 items-center justify-center rounded-5xl bg-white/60 p-8 shadow-card ring-1 ring-sky-100">
                      <LoadingState label="Carregando portal..." />
                    </div>
                  }
                >
                  <LoginClient />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Logo Trust Strip */}
        <PlumeTrustStrip />

        {/* 4. Three-Up Feature Grid */}
        <PlumeFeatures />

        {/* 5. Full-Bleed Gradient Showcase Band */}
        <PlumeShowcase />

        {/* 6. Soft CTA Card */}
        <PlumeCta />
      </main>

      {/* 7. Dark Footer */}
      <PlumeFooter />
    </div>
  );
}
