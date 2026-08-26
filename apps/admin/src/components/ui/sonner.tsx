"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-brand-ink group-[.toaster]:border-brand-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:font-sans",
          description: "group-[.toast]:text-brand-muted",
          actionButton:
            "group-[.toast]:bg-brand-blue group-[.toast]:text-white group-[.toast]:font-semibold",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-brand-muted",
          success:
            "group-[.toaster]:border-brand-green-light/40 group-[.toaster]:bg-white text-brand-ink",
          error:
            "group-[.toaster]:border-brand-danger/40 group-[.toaster]:bg-white text-brand-ink",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
