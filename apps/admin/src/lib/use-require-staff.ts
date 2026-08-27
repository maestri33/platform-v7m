"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/session";
import { useAuth } from "@/lib/auth-context";

type Phase = "checking" | "ok" | "denied";

export function useRequireStaff(): Phase {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [phase, setPhase] = useState<Phase>("checking");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;

    if (!getAccessToken() || !user) {
      router.replace("/login");
      return;
    }

    // Role-based route gating
    const isOnboardingRoute = pathname.startsWith("/onboarding");
    const isHubRoute = pathname.startsWith("/hub");
    const isPromoterRoute = pathname.startsWith("/vendas") || pathname.startsWith("/conta");

    if (isOnboardingRoute) {
      // Onboarding is accessible to all authenticated users (candidate, promoter, coordinator, staff)
      setPhase("ok");
    } else if (isHubRoute) {
      if (user.isCoordinator || user.isStaff) {
        setPhase("ok");
      } else {
        router.replace("/vendas");
      }
    } else if (isPromoterRoute) {
      if (user.isPromoter || user.isCoordinator || user.isStaff || user.isCandidate) {
        setPhase("ok");
      } else {
        router.replace("/login?denied=1");
      }
    } else {
      // Master Admin route (e.g. /dashboard, /polos, /financeiro, /usuarios)
      if (user.isStaff) {
        setPhase("ok");
      } else if (user.isCoordinator) {
        router.replace("/hub");
      } else if (user.isPromoter || user.isCandidate) {
        router.replace("/vendas");
      } else {
        router.replace("/login?denied=1");
      }
    }
  }, [router, pathname, user, isLoading, mounted]);

  return phase;
}
