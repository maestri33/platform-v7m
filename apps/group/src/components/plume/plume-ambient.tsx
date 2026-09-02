import React from "react";

export function PlumeAmbient() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Subtle radial dot-grid background */}
      <div className="dotgrid absolute inset-0 opacity-60" />

      {/* Floating ambient pastel blobs */}
      <div className="ghost-blob animate-float-slow absolute -top-24 -left-20 size-96 rounded-full bg-sky-200/50" />
      <div className="ghost-blob animate-float-reverse absolute top-1/3 -right-28 size-[30rem] rounded-full bg-coral-300/35" />
      <div className="ghost-blob animate-float-slow absolute -bottom-32 left-1/4 size-[28rem] rounded-full bg-sky-300/40" />
    </div>
  );
}
