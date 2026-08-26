"use client";

import { useSyncExternalStore } from "react";
import type { HubInfo, TokenResponse } from "./types";

const ACCESS_KEY = "hub.access";
const REFRESH_KEY = "hub.refresh";
const INFO_KEY = "hub.info";

let cachedAccess: string | null = null;
let cachedRefresh: string | null = null;
let cachedHub: HubInfo | null = null;
let cachedAuth: boolean = false;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function syncCache() {
  if (typeof window === "undefined") {
    cachedAccess = null;
    cachedRefresh = null;
    cachedHub = null;
    cachedAuth = false;
    return;
  }

  try {
    cachedAccess =
      sessionStorage.getItem(ACCESS_KEY) ||
      localStorage.getItem(ACCESS_KEY) ||
      getCookie(ACCESS_KEY) ||
      null;
    cachedRefresh =
      sessionStorage.getItem(REFRESH_KEY) ||
      localStorage.getItem(REFRESH_KEY) ||
      getCookie(REFRESH_KEY) ||
      null;
    const raw =
      sessionStorage.getItem(INFO_KEY) ||
      localStorage.getItem(INFO_KEY) ||
      getCookie(INFO_KEY);
    cachedHub = raw ? JSON.parse(raw) : null;
    cachedAuth = Boolean(cachedAccess);
  } catch {
    cachedHub = null;
    cachedAuth = false;
  }
}

// Initial sync on client
syncCache();

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export const sessionStore = {
  getAccessToken: (): string | null => cachedAccess,
  getRefreshToken: (): string | null => cachedRefresh,
  getHub: (): HubInfo | null => cachedHub,
  isAuthenticated: (): boolean => cachedAuth,

  saveSession: (tokens: TokenResponse, hub?: HubInfo | null) => {
    cachedAccess = tokens.access_token;
    cachedRefresh = tokens.refresh_token;
    if (hub !== undefined) cachedHub = hub;
    cachedAuth = true;

    if (typeof window !== "undefined") {
      sessionStorage.setItem(ACCESS_KEY, tokens.access_token);
      sessionStorage.setItem(REFRESH_KEY, tokens.refresh_token);
      document.cookie = `${ACCESS_KEY}=${tokens.access_token}; path=/; max-age=86400; SameSite=Lax`;
      if (hub) {
        sessionStorage.setItem(INFO_KEY, JSON.stringify(hub));
        document.cookie = `${INFO_KEY}=${encodeURIComponent(JSON.stringify(hub))}; path=/; max-age=86400; SameSite=Lax`;
      }
    }
    notify();
  },

  clearSession: () => {
    cachedAccess = null;
    cachedRefresh = null;
    cachedHub = null;
    cachedAuth = false;

    if (typeof window !== "undefined") {
      sessionStorage.removeItem(ACCESS_KEY);
      sessionStorage.removeItem(REFRESH_KEY);
      sessionStorage.removeItem(INFO_KEY);
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(INFO_KEY);
      document.cookie = `${ACCESS_KEY}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `${INFO_KEY}=; path=/; max-age=0; SameSite=Lax`;
    }
    notify();
  },

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useSession() {
  const isAuth = useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.isAuthenticated,
    () => false,
  );
  const hub = useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getHub,
    () => null,
  );
  const token = useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getAccessToken,
    () => null,
  );

  return {
    isAuthenticated: isAuth,
    hub,
    accessToken: token,
    logout: sessionStore.clearSession,
  };
}
