'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { MarqueeLogo } from './types';

export const DEFAULT_LOGOS: MarqueeLogo[] = [
  {
    name: 'Procure',
    alt: 'Procure Logo',
    src: 'https://svgl.app/library/procure.svg',
    gradient: {
      from: '#0052FF',
      to: '#3B82F6',
      style: {
        background: 'radial-gradient(circle, rgba(0, 82, 255, 0.25) 0%, rgba(59, 130, 246, 0.05) 70%, transparent 100%)',
      },
    },
  },
  {
    name: 'Shopify',
    alt: 'Shopify Logo',
    src: 'https://svgl.app/library/shopify.svg',
    gradient: {
      from: '#95BF47',
      to: '#FFD700',
      style: {
        background: 'radial-gradient(circle, rgba(149, 191, 71, 0.25) 0%, rgba(255, 215, 0, 0.08) 70%, transparent 100%)',
      },
    },
  },
  {
    name: 'Blender',
    alt: 'Blender Logo',
    src: 'https://svgl.app/library/blender.svg',
    gradient: {
      from: '#2282C9',
      to: '#E87D0D',
      style: {
        background: 'radial-gradient(circle, rgba(34, 130, 201, 0.25) 0%, rgba(232, 125, 13, 0.1) 70%, transparent 100%)',
      },
    },
  },
  {
    name: 'Figma',
    alt: 'Figma Logo',
    src: 'https://svgl.app/library/figma.svg',
    gradient: {
      from: '#A259FF',
      to: '#F24E1E',
      style: {
        background: 'radial-gradient(circle, rgba(162, 89, 255, 0.25) 0%, rgba(242, 78, 30, 0.1) 70%, transparent 100%)',
      },
    },
  },
  {
    name: 'Spotify',
    alt: 'Spotify Logo',
    src: 'https://svgl.app/library/spotify.svg',
    gradient: {
      from: '#1DB954',
      to: '#EB1E55',
      style: {
        background: 'radial-gradient(circle, rgba(29, 185, 84, 0.25) 0%, rgba(235, 30, 85, 0.1) 70%, transparent 100%)',
      },
    },
  },
  {
    name: 'Lottielab',
    alt: 'Lottielab Logo',
    src: 'https://svgl.app/library/lottielab.svg',
    gradient: {
      from: '#00DDA2',
      to: '#FFDD00',
      style: {
        background: 'radial-gradient(circle, rgba(0, 221, 162, 0.25) 0%, rgba(255, 221, 0, 0.08) 70%, transparent 100%)',
      },
    },
  },
  {
    name: 'Google Cloud',
    alt: 'Google Cloud Logo',
    src: 'https://svgl.app/library/google-cloud.svg',
    gradient: {
      from: '#4285F4',
      to: '#34A853',
      style: {
        background: 'radial-gradient(circle, rgba(66, 133, 244, 0.25) 0%, rgba(52, 168, 83, 0.08) 70%, transparent 100%)',
      },
    },
  },
  {
    name: 'Bing',
    alt: 'Bing Logo',
    src: 'https://svgl.app/library/bing.svg',
    gradient: {
      from: '#008080',
      to: '#00D2FF',
      style: {
        background: 'radial-gradient(circle, rgba(0, 128, 128, 0.25) 0%, rgba(0, 210, 255, 0.1) 70%, transparent 100%)',
      },
    },
  },
];

interface MarqueeScrollerProps {
  logos?: MarqueeLogo[];
  className?: string;
  speedSeconds?: number;
}

export const MarqueeScroller: React.FC<MarqueeScrollerProps> = ({
  logos = DEFAULT_LOGOS,
  className,
  speedSeconds = 30,
}) => {
  // Render list twice for seamless loop
  const loopList = [...logos, ...logos];

  return (
    <div
      className={twMerge(
        clsx(
          'relative w-full overflow-hidden select-none',
          className
        )
      )}
      style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
      }}
    >
      <style>{`
        @keyframes v7m-marquee-scroll {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .v7m-marquee-track {
          display: flex;
          width: max-content;
          gap: 1.25rem;
          animation: v7m-marquee-scroll ${speedSeconds}s linear infinite;
        }
        .v7m-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="v7m-marquee-track py-4">
        {loopList.map((logo, index) => (
          <div
            key={`${logo.name}-${index}`}
            className="group relative h-24 w-40 shrink-0 flex items-center justify-center rounded-full bg-white border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all overflow-hidden cursor-pointer"
          >
            {/* Gradient background with scale and opacity hover animation */}
            <div
              className="absolute inset-0 scale-150 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500 ease-out pointer-events-none"
              style={logo.gradient.style}
            />

            {/* Logo image that inverts/turns black on hover */}
            <img
              src={logo.src}
              alt={logo.alt}
              loading="lazy"
              className="h-8 w-auto max-w-[90px] object-contain relative z-10 transition-all duration-300 group-hover:brightness-0 group-hover:invert"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
