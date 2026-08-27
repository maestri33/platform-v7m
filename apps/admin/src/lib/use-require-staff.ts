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

  useEffect(() => {
    if (isLoading) return;

    if (!getAccessToken() || !user) {
      router.replace("/login");
      return;
    }

    // Role-based route gating
    const isHubRoute = pathname.startsWith("/hub");
    const isPromoterRoute = pathname.startsWith("/vendas") || pathname.startsWith("/conta");

    if (isHubRoute) {
      if (user.isCoordinator || user.isStaff) {
        setPhase("ok");
      } else {
        router.replace("/vendas");
      }
    } else if (isPromoterRoute) {
      if (user.isPromoter || user.isCoordinator || user.isStaff) {
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
      } else if (user.isPromoter) {
        router.replace("/vendas");
      } else {
        router.replace("/login?denied=1");
      }
    }
  }, [router, pathname, user, isLoading]);

  return phase;
}
