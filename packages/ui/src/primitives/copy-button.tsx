"use client";

import { useState } from "react";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import { Button } from "./button";

export function CopyButton({
  text,
  label = "Copiar",
  copiedLabel = "Copiado!",
  className,
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={`text-xs gap-1.5 h-8 ${className || ""}`}
    >
      {copied ? (
        <>
          <IconCheck className="size-3.5 text-brand-green" />
          <span>{copiedLabel}</span>
        </>
      ) : (
        <>
          <IconCopy className="size-3.5 text-brand-muted" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}
