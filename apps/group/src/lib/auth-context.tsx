"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { clearSession, getAccessToken, getServerAccessToken, subscribeStorage } from "@/lib/session";
import { whoami, type WhoAmI } from "@/lib/api";

export type PortalContext = "admin" | "hub" | "promoter";

export interface UserProfile {
  external_id: string;
  roles: string[];
  name?: string | null;
  photo_url?: string | null;
  avatar_url?: string | null;
  isStaff: boolean;
  isCoordinator: boolean;
  isPromoter: boolean;
  isCandidate: boolean;
}

export function getInitialRouteForUser(user: UserProfile | null): string {
  if (!user) return "/login";
  if (user.isCandidate && !user.isPromoter && !user.isStaff && !user.isCoordinator) {
    return "/onboarding";
  }
  if (user.isStaff) return "/admin";
  if (user.isCoordinator) return "/hub";
  return "/promoter";
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

export function decodeJwtPayload(token: string): { external_id?: string; roles?: string[]; photo_url?: string; avatar_url?: string } | null {
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

function parseProfileFromToken(token: string | null): UserProfile | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const roles = payload.roles || [];
  const extId = payload.external_id || "";
  const isStaff = roles.includes("staff") || roles.includes("superuser");
  const isCoordinator = roles.includes("coordinator") || isStaff;
  const isPromoter = roles.includes("promoter") || isCoordinator;
  const isCandidate = roles.includes("candidate");

  return {
    external_id: extId,
    roles,
    name: null,
    photo_url: payload.photo_url || payload.avatar_url || null,
    avatar_url: payload.avatar_url || payload.photo_url || null,
    isStaff,
    isCoordinator,
    isPromoter,
    isCandidate,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = React.useSyncExternalStore(subscribeStorage, getAccessToken, getServerAccessToken);
  const initialUser = React.useMemo(() => parseProfileFromToken(token), [token]);
  const [user, setUser] = React.useState<UserProfile | null>(initialUser);
  const [activeContext, setActiveContextState] = React.useState<PortalContext>("promoter");
  const [isLoading, setIsLoading] = React.useState(false);

  // Fetch or derive user profile from token & whoami
  React.useEffect(() => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const baseProfile = parseProfileFromToken(token);
    if (baseProfile) {
      setUser((prev) => prev ?? baseProfile);
    }

    let cancelled = false;
    whoami()
      .then((info: WhoAmI) => {
        if (cancelled) return;
        const allRoles = info.roles?.length ? info.roles : (baseProfile?.roles || []);
        const isStaff = allRoles.includes("staff") || allRoles.includes("superuser");
        const isCoordinator = allRoles.includes("coordinator") || isStaff;
        const isPromoter = allRoles.includes("promoter") || isCoordinator;
        const isCandidate = allRoles.includes("candidate");

        const photo = info.photo_url || info.avatar_url || baseProfile?.photo_url || null;

        const profile: UserProfile = {
          external_id: info.external_id || baseProfile?.external_id || "",
          roles: allRoles,
          name: info.name || null,
          photo_url: photo,
          avatar_url: photo,
          isStaff,
          isCoordinator,
          isPromoter,
          isCandidate,
        };

        setUser(profile);

        // Compute available contexts
        const available: PortalContext[] = [];
        if (profile.isPromoter) available.push("promoter");
        if (profile.isCoordinator) available.push("hub");
        if (profile.isStaff) available.push("admin");

        // Resolve preferred context from storage or default to highest privilege
        const stored = typeof window !== "undefined" ? (localStorage.getItem(CONTEXT_STORAGE_KEY) as PortalContext) : null;
        if (stored && available.includes(stored)) {
          setActiveContextState(stored);
        } else if (profile.isStaff) {
          setActiveContextState("admin");
        } else if (profile.isCoordinator) {
          setActiveContextState("hub");
        } else {
          setActiveContextState("promoter");
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (baseProfile) {
          setUser(baseProfile);
          const available: PortalContext[] = [];
          if (baseProfile.isPromoter) available.push("promoter");
          if (baseProfile.isCoordinator) available.push("hub");
          if (baseProfile.isStaff) available.push("admin");

          const stored = typeof window !== "undefined" ? (localStorage.getItem(CONTEXT_STORAGE_KEY) as PortalContext) : null;
          if (stored && available.includes(stored)) {
            setActiveContextState(stored);
          } else if (baseProfile.isStaff) {
            setActiveContextState("admin");
          } else if (baseProfile.isCoordinator) {
            setActiveContextState("hub");
          } else {
            setActiveContextState("promoter");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const profile = React.useMemo(() => {
    return user ?? parseProfileFromToken(token);
  }, [user, token]);

  const availableContexts = React.useMemo<PortalContext[]>(() => {
    if (!profile) return ["promoter"];
    const list: PortalContext[] = [];
    if (profile.isStaff) list.push("admin");
    if (profile.isCoordinator) list.push("hub");
    if (profile.isPromoter) list.push("promoter");
    return list.length > 0 ? list : ["promoter"];
  }, [profile]);

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
    router.replace("/login");
  }, [router]);

  const value = React.useMemo(
    () => ({
      user: profile,
      activeContext,
      setActiveContext,
      availableContexts,
      isLoading,
      logout,
    }),
    [profile, activeContext, setActiveContext, availableContexts, isLoading, logout]
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
