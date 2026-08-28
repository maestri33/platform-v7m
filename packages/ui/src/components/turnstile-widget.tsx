import * as React from "react";

export interface TurnstileWidgetProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onError?: (error?: string) => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
  className?: string;
  disabled?: boolean;
}

declare const process: { env?: { NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string } } | undefined;

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: (error?: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey = (typeof process !== "undefined" ? process?.env?.NEXT_PUBLIC_TURNSTILE_SITE_KEY : undefined) || "1x00000000000000000000AA",
  onVerify,
  onError,
  onExpire,
  theme = "auto",
  size = "normal",
  className = "",
  disabled = false,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const widgetIdRef = React.useRef<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (disabled) return;

    const scriptId = "cloudflare-turnstile-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current) return;
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup errors
        }
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          "error-callback": onError,
          "expired-callback": onExpire,
          theme,
          size,
        });
        widgetIdRef.current = id;
        setLoaded(true);
      } catch (err) {
        if (onError) onError(String(err));
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        renderWidget();
      };
      script.onerror = () => {
        if (onError) onError("Failed to load Turnstile script");
      };
      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    } else {
      script.addEventListener("load", renderWidget);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify, onError, onExpire, theme, size, disabled]);

  if (disabled) return null;

  return (
    <div
      className={`v7m-turnstile-container my-2 flex justify-center ${className}`}
      data-testid="turnstile-widget"
    >
      <div ref={containerRef} />
      {!loaded && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Verificação de segurança anti-bot...</span>
        </div>
      )}
    </div>
  );
};
