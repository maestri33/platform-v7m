"use client";

import * as React from "react";
import { useSession } from "@/lib/session";
import { HubHeader } from "@/components/layout/hub-header";
import { HubNav } from "@/components/layout/hub-nav";
import { LoginView } from "@/components/auth/login-view";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useSession();

  return (
    <div id="hub-root" className="min-h-screen flex flex-col bg-brand-bg">
      <div
        id="login-container"
        style={{ display: isAuthenticated ? "none" : "block" }}
      >
        <LoginView />
      </div>
      <div
        id="app-view"
        style={{ display: isAuthenticated ? "flex" : "none" }}
        className="min-h-screen flex-col bg-brand-bg"
      >
        <HubHeader />
        <HubNav />
        <main className="flex-1 pb-12">{children}</main>
      </div>
    </div>
  );
}
