"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Feather, ArrowRight } from "lucide-react";

export function PlumeFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="w-full bg-ink-900 text-sky-50 transition-colors">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand & Socials */}
          <div className="flex flex-col items-start">
            <Link href="#hero" className="group flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-400 to-coral-400 shadow-sm">
                <Feather className="size-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-nunito text-2xl font-black tracking-tight text-white">
                Plume
              </span>
            </Link>

            <p className="font-nunito mt-4 text-sm font-normal leading-relaxed text-sky-100/70">
              The friendly AI product-design agent crafting delightful, high-fidelity front-end experiences directly alongside your team.
            </p>

            {/* Social Icon Tiles (turn sky-400 on hover) */}
            <div className="mt-6 flex items-center gap-3">
              {/* X / Twitter */}
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="X (formerly Twitter)"
                className="flex size-10 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-sky-400 hover:text-ink-900"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* GitHub */}
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="flex size-10 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-sky-400 hover:text-ink-900"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>

              {/* Discord */}
              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Discord"
                className="flex size-10 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-sky-400 hover:text-ink-900"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Product Links */}
          <div className="flex flex-col items-start">
            <h4 className="font-nunito text-sm font-black uppercase tracking-wider text-sky-400">
              Product
            </h4>
            <ul className="font-nunito mt-4 space-y-2.5 text-sm font-bold text-sky-100/70">
              <li>
                <a href="#features" className="transition hover:text-white">
                  Features
                </a>
              </li>
              <li>
                <a href="#prompt-library" className="transition hover:text-white">
                  Prompt Library
                </a>
              </li>
              <li>
                <a href="#hero" className="transition hover:text-white">
                  Canvas Workspace
                </a>
              </li>
              <li>
                <a href="#features" className="transition hover:text-white">
                  Code Export
                </a>
              </li>
              <li>
                <a href="#hero" className="transition hover:text-white">
                  Changelog
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Company Links */}
          <div className="flex flex-col items-start">
            <h4 className="font-nunito text-sm font-black uppercase tracking-wider text-sky-400">
              Company
            </h4>
            <ul className="font-nunito mt-4 space-y-2.5 text-sm font-bold text-sky-100/70">
              <li>
                <a href="#hero" className="transition hover:text-white">
                  About Plume
                </a>
              </li>
              <li>
                <a href="#hero" className="transition hover:text-white">
                  Manifesto
                </a>
              </li>
              <li>
                <a href="#hero" className="transition hover:text-white">
                  Careers
                </a>
              </li>
              <li>
                <a href="#hero" className="transition hover:text-white">
                  Press Kit
                </a>
              </li>
              <li>
                <a href="#hero" className="transition hover:text-white">
                  Security
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter Mini-Form */}
          <div className="flex flex-col items-start">
            <h4 className="font-nunito text-sm font-black uppercase tracking-wider text-sky-400">
              Stay in the loop
            </h4>
            <p className="font-nunito mt-4 text-sm font-normal text-sky-100/70">
              Get design inspiration, new prompt recipes, and product updates delivered to your inbox.
            </p>

            {subscribed ? (
              <div className="mt-4 rounded-2xl bg-sky-500/20 border border-sky-400/40 p-3 text-xs font-bold text-sky-300">
                You are on the list. Thank you!
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 flex w-full items-center gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@work.com"
                  className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2.5 font-nunito text-sm text-white placeholder-white/40 shadow-inner outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-400 text-ink-900 transition hover:bg-sky-300 active:scale-95 shadow-sm"
                >
                  <ArrowRight className="size-4" strokeWidth={2.5} />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="font-nunito text-xs text-sky-100/50">
            © 2026 Plume Labs. Made with care, not em-dashes.
          </p>

          <div className="flex items-center gap-6 font-nunito text-xs font-bold text-sky-100/60">
            <a href="#hero" className="transition hover:text-white">
              Privacy
            </a>
            <a href="#hero" className="transition hover:text-white">
              Terms
            </a>
            <a href="#hero" className="transition hover:text-white">
              Status
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
