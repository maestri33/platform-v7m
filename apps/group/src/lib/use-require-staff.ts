"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getAccessToken } from "@/lib/session";
import { useAuth } from "@/lib/auth-context";

type Phase = "checking" | "ok" | "denied";

export function useRequireStaff(): Phase {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  // Role-based route gating derived synchronously during render
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isHubRoute = pathname.startsWith("/hub");
  const isPromoterRoute =
    pathname.startsWith("/promoter") ||
    pathname.startsWith("/vendas") ||
    pathname.startsWith("/conta");

  let phase: Phase = "checking";
  let redirectTarget: string | null = null;

  if (!isLoading) {
    if (!getAccessToken() || !user) {
      phase = "denied";
      redirectTarget = "/login";
    } else if (isOnboardingRoute) {
      phase = "ok";
    } else if (isHubRoute) {
      if (user.isCoordinator || user.isStaff) {
        phase = "ok";
      } else {
        phase = "denied";
        redirectTarget = "/promoter";
      }
    } else if (isPromoterRoute) {
      if (user.isPromoter || user.isCoordinator || user.isStaff || user.isCandidate) {
        phase = "ok";
      } else {
        phase = "denied";
        redirectTarget = "/login?denied=1";
      }
    } else {
      // Master Admin route (e.g. /dashboard, /polos, /financeiro, /usuarios)
      if (user.isStaff) {
        phase = "ok";
      } else if (user.isCoordinator) {
        phase = "denied";
        redirectTarget = "/hub";
      } else if (user.isPromoter || user.isCandidate) {
        phase = "denied";
        redirectTarget = "/promoter";
      } else {
        phase = "denied";
        redirectTarget = "/login?denied=1";
      }
    }
  }

  useEffect(() => {
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [redirectTarget, router]);

  return phase;
}
