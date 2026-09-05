import React from "react";
import styles from "./layout.module.css";

export type StampVariant = "flag" | "seal" | "marks";

export interface BrandStampProps {
  stamp?: StampVariant;
  className?: string;
}

export function BrandStamp({ stamp = "flag", className = "" }: BrandStampProps) {
  if (stamp === "seal") {
    return (
      <svg
        className={`${styles.sealSvg} ${className}`}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M32 6 58 32 32 58 6 32Z"
          fill="none"
          stroke="var(--color-yellow, #ffdf00)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M32 16 48 32 32 48 16 32Z"
          fill="var(--color-yellow, #ffdf00)"
          opacity="0.12"
        />
        <path
          d="M24 32l6 6 12-13"
          stroke="var(--color-yellow, #ffdf00)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (stamp === "marks") {
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 31 10"
        fill="none"
        className={`w-8 h-2.5 ${className}`}
      >
        <path d="M4 2.1 6.2 5 4 7.9 1.8 5Z" fill="var(--color-green, #009c3b)" />
        <circle cx="11.6" cy="5" r="1.9" fill="var(--color-yellow, #ffdf00)" />
        <rect
          x="17.3"
          y="1.3"
          width="1.9"
          height="7.4"
          rx="0.95"
          fill="var(--color-blue-bright, #1e6fe0)"
        />
        <path
          d="M26 1.5v7M22.5 5h7"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Default: Waving Brazil Flag
  return (
    <svg
      className={`${styles.flagSvg} ${className}`}
      viewBox="0 0 84 64"
      fill="none"
      aria-hidden="true"
    >
      <rect x="4" y="2" width="4" height="60" rx="2" fill="rgba(255, 255, 255, 0.17)" />
      <circle cx="6" cy="3" r="3" fill="var(--color-yellow, #ffdf00)" />
      <g className={styles.flagCloth}>
        <rect
          x="8"
          y="6"
          width="62"
          height="40"
          rx="4"
          fill="var(--color-green, #009c3b)"
        />
        <path d="M39 12l22 14-22 14-22-14z" fill="var(--color-yellow, #ffdf00)" />
        <circle
          cx="39"
          cy="26"
          r="8.5"
          fill="var(--color-blue-bright, #1e6fe0)"
        />
        <path
          d="M35.5 26.2l2.8 2.8 5.2-5.6"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
