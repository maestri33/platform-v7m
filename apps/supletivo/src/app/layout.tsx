import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "@v7m/ui/tokens";
import "./globals.css";

import { AppHeader } from "@/components/ui/app-header";
import { AuroraBackground, ConditionalFooter } from "@v7m/ui";
import { AppProviders } from "@/lib/query-client";
import { ServiceWorkerRegister } from "./_components/service-worker-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Supletivo Brasil",
  title: "Supletivo Brasil — conclua seus estudos",
  description:
    "Conclua o Ensino Fundamental ou Médio pelo Supletivo Brasil. Matrícula rápida e 100% online.",
  // PWA / standalone no iOS: capable abre fullscreen, status bar translúcida deixa
  // o fundo da marca aparecer atrás (a safe-area no shell compensa o notch).
  appleWebApp: {
    capable: true,
    title: "Supletivo Brasil",
    statusBarStyle: "black-translucent",
  },
  // O Next 16 só emite "mobile-web-app-capable" (moderno) a partir do appleWebApp.
  // iOS mais antigo ainda exige o nome legado apple-prefixado pra abrir standalone.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#012169",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} antialiased`}>
      <body className="flex h-dvh flex-col overflow-hidden bg-brand-bg text-brand-ink">
        <a
          href="#conteudo"
          className="sr-only rounded-lg focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-brand-ink focus:px-4 focus:py-2 focus:font-bold focus:text-white"
        >
          Pular para o conteúdo
        </a>
        <AuroraBackground />
        <AppHeader />
        {/* Faixa de scroll interna: o body fica travado (sem bounce); só aqui rola. */}
        <AppProviders>
          <div className="app-scroll">{children}</div>
        </AppProviders>
        <ConditionalFooter />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
