import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

import { AppHeader } from "@/components/layout/app-header";
import { UnifiedFooter } from "@v7m/ui";
import { Toaster } from "@v7m/ui";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/lib/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Maestri.group Portal",
  title: "Maestri.group Portal de Gestão — Administração, Polos e Promotores",
  description: "Portal unificado de gestão da plataforma Maestri.group / Supletivo Brasil.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#012169",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} antialiased`}>
      <body className="admin-bg flex min-h-dvh flex-col text-brand-ink">
        <a
          href="#conteudo"
          className="sr-only rounded-lg focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-brand-ink focus:px-4 focus:py-2 focus:font-bold focus:text-white"
        >
          Pular para o conteúdo
        </a>
        <QueryProvider>
          <AuthProvider>
            <AppHeader />
            <main id="conteudo" className="flex-1">
              {children}
            </main>
            <UnifiedFooter brand="group" context="portal" showVersion />
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
