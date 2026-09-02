'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MarqueeScroller } from './marquee-scroller';
import type { ModernHeroSectionProps } from './types';

const DEFAULT_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260505_101331_74f9b798-3f00-4e86-8a01-377aa16ffeaa.mp4';

export const ModernHeroSection: React.FC<ModernHeroSectionProps> = ({
  headline = (
    <>
      Foundation of the
      <br />
      new digital epoch
    </>
  ),
  subheadline = 'Designing products, powering ecosystems and laying the foundation of a decentralized web for enterprises, builders and communities alike.',
  contactButtonText = 'Contact Us',
  contactButtonHref = '#contact',
  videoSrc = DEFAULT_VIDEO_URL,
  logos,
  onContactClick,
  onProductsClick,
  onDocsClick,
  className,
}) => {
  return (
    <section
      className={twMerge(clsx('w-full py-8 px-4 sm:px-6 lg:px-8 bg-[#f9fafb]', className))}
      style={{ backgroundColor: '#f9fafb' }}
    >
      {/* 2. Main Hero Container & Video Background */}
      <div
        className="relative w-full max-w-[1400px] mx-auto rounded-[48px] bg-white border border-slate-200/50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.03)] overflow-hidden h-[600px] flex flex-col"
        style={{
          position: 'relative',
          borderRadius: '48px',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          border: '1px solid rgba(226, 232, 240, 0.5)',
          boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.03)',
          height: '600px',
        }}
      >
        {/* Absolutely positioned underlying layer for the background video (No overlays) */}
        <div
          className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            overflow: 'hidden',
          }}
        >
          <video
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            className="w-full h-full object-cover scale-105 transition-transform duration-1000"
          />
        </div>

        {/* 3. Hero Text Content */}
        <div
          className="relative z-20 flex-1 px-8 md:px-16 pt-12 md:pt-16 flex flex-col items-start"
          style={{ position: 'relative', zIndex: 20 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl flex flex-col items-start text-left"
          >
            {/* Headline */}
            <h1
              className="text-[42px] md:text-[56px] font-medium tracking-tight text-[#0a1b33] leading-[1.08]"
              style={{
                fontFamily: 'var(--font-display, Outfit, sans-serif)',
                color: '#0a1b33',
                lineHeight: 1.08,
              }}
            >
              {headline}
            </h1>

            {/* Subheadline */}
            <p
              className="text-[14px] md:text-[15px] text-[#64748b] mt-4 max-w-xl leading-relaxed"
              style={{
                fontFamily: 'var(--font-sans, Inter, sans-serif)',
                color: '#64748b',
              }}
            >
              {subheadline}
            </p>

            {/* Contact Button */}
            <motion.a
              href={contactButtonHref}
              onClick={onContactClick}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="mt-8 inline-flex items-center justify-center px-7 py-3 rounded-full bg-[#0a152d] text-white text-[14px] font-medium shadow-md hover:bg-[#122347] transition-colors cursor-pointer"
              style={{
                backgroundColor: '#0a152d',
                color: '#ffffff',
                borderRadius: '9999px',
              }}
            >
              {contactButtonText}
            </motion.a>
          </motion.div>
        </div>

        {/* 4. Floating Bottom Navbar */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30"
          style={{
            position: 'absolute',
            bottom: '2.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
          }}
        >
          <motion.nav
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center bg-white/90 backdrop-blur-2xl px-1.5 py-1.5 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-slate-200/40 gap-1 sm:gap-2"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '9999px',
              border: '1px solid rgba(226, 232, 240, 0.4)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {/* Circular logo placeholder */}
            <div
              className="w-9 h-9 bg-white border border-slate-100 shadow-sm rounded-full flex items-center justify-center text-slate-800 text-sm select-none"
              style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '9999px',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✦
            </div>

            {/* Text navigation buttons */}
            <button
              type="button"
              onClick={onProductsClick}
              className="text-[12px] font-semibold text-slate-500 hover:text-[#0a1b33] px-3 py-1.5 transition-colors cursor-pointer"
            >
              Products
            </button>

            <button
              type="button"
              onClick={onDocsClick}
              className="text-[12px] font-semibold text-slate-500 hover:text-[#0a1b33] px-3 py-1.5 transition-colors cursor-pointer"
            >
              Docs
            </button>

            {/* "Get in touch" button */}
            <button
              type="button"
              onClick={onContactClick}
              className="bg-white px-5 py-2 rounded-full text-[12px] font-semibold text-[#0a1b33] border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all flex items-center gap-1 cursor-pointer"
              style={{
                backgroundColor: '#ffffff',
                color: '#0a1b33',
                borderRadius: '9999px',
                border: '1px solid rgba(226, 232, 240, 0.6)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span>Get in touch</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#0a1b33]" />
            </button>
          </motion.nav>
        </div>
      </div>

      {/* 5. Seamless Marquee Logo Scroller Component */}
      <div className="mt-10 max-w-[1400px] mx-auto">
        <MarqueeScroller logos={logos} />
      </div>
    </section>
  );
};
