"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { clearSession, getAccessToken, subscribeStorage } from "@/lib/session";
import { whoami, type WhoAmI } from "@/lib/api";

export type PortalContext = "admin" | "hub" | "promotor";

export interface UserProfile {
  external_id: string;
  roles: string[];
  name?: string | null;
  isStaff: boolean;
  isCoordinator: boolean;
  isPromoter: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  activeContext: PortalContext;
  setActiveContext: (ctx: PortalContext) => void;
  availableContexts: PortalContext[];
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const CONTEXT_STORAGE_KEY = "v7m.active_context";

function decodeJwtPayload(token: string): { external_id?: string; roles?: string[] } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [activeContext, setActiveContextState] = React.useState<PortalContext>("admin");
  const [isLoading, setIsLoading] = React.useState(true);

  // Sync token from localStorage
  React.useEffect(() => {
    const update = () => {
      const currentToken = getAccessToken();
      setToken(currentToken);
    };
    update();
    return subscribeStorage(update);
  }, []);

  // Fetch or derive user profile from token & whoami
  React.useEffect(() => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const payload = decodeJwtPayload(token);
    const roles = payload?.roles || [];
    const extId = payload?.external_id || "";

    whoami()
      .then((info: WhoAmI) => {
        if (cancelled) return;
        const allRoles = info.roles?.length ? info.roles : roles;
        const isStaff = allRoles.includes("staff") || allRoles.includes("superuser");
        const isCoordinator = allRoles.includes("coordinator") || isStaff;
        const isPromoter = allRoles.includes("promoter") || isCoordinator;

        const profile: UserProfile = {
          external_id: info.external_id || extId,
          roles: allRoles,
          name: info.name || null,
          isStaff,
          isCoordinator,
          isPromoter,
        };

        setUser(profile);

        // Compute available contexts
        const available: PortalContext[] = [];
        if (profile.isStaff) available.push("admin");
        if (profile.isCoordinator) available.push("hub");
        if (profile.isPromoter) available.push("promotor");

        // Resolve preferred context from storage or role priority
        const stored = typeof window !== "undefined" ? (localStorage.getItem(CONTEXT_STORAGE_KEY) as PortalContext) : null;
        if (stored && available.includes(stored)) {
          setActiveContextState(stored);
        } else if (available.length > 0) {
          setActiveContextState(available[0]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback to token claims if whoami is slow or offline
        const isStaff = roles.includes("staff") || roles.includes("superuser");
        const isCoordinator = roles.includes("coordinator") || isStaff;
        const isPromoter = roles.includes("promoter") || isCoordinator;

        setUser({
          external_id: extId,
          roles,
          name: null,
          isStaff,
          isCoordinator,
          isPromoter,
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const availableContexts = React.useMemo<PortalContext[]>(() => {
    if (!user) return ["promotor"];
    const list: PortalContext[] = [];
    if (user.isStaff) list.push("admin");
    if (user.isCoordinator) list.push("hub");
    if (user.isPromoter) list.push("promotor");
    return list.length > 0 ? list : ["promotor"];
  }, [user]);

  const setActiveContext = React.useCallback(
    (ctx: PortalContext) => {
      if (!availableContexts.includes(ctx)) return;
      setActiveContextState(ctx);
      if (typeof window !== "undefined") {
        localStorage.setItem(CONTEXT_STORAGE_KEY, ctx);
      }
    },
    [availableContexts]
  );

  const logout = React.useCallback(() => {
    clearSession();
    setUser(null);
    setToken(null);
    router.replace("/login");
  }, [router]);

  const value = React.useMemo(
    () => ({
      user,
      activeContext,
      setActiveContext,
      availableContexts,
      isLoading,
      logout,
    }),
    [user, activeContext, setActiveContext, availableContexts, isLoading, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
