"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-brand-ink group-[.toaster]:border-brand-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:font-sans",
          description: "group-[.toast]:text-brand-muted",
          actionButton:
            "group-[.toast]:bg-brand-blue group-[.toast]:text-white font-medium",
          cancelButton:
            "group-[.toast]:bg-brand-muted/20 group-[.toast]:text-brand-ink",
          error:
            "group-[.toaster]:bg-brand-danger-bg group-[.toaster]:text-brand-danger group-[.toaster]:border-brand-danger/30",
          success:
            "group-[.toaster]:bg-brand-green-bg group-[.toaster]:text-brand-green-dark group-[.toaster]:border-brand-green/30",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
