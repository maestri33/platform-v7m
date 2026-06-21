import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

import { AppHeader } from "@/components/ui/app-header";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { SiteFooter } from "@/components/ui/site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Supletivo Brasil — conclua seus estudos",
  description:
    "Conclua o Ensino Fundamental ou Médio pelo Supletivo Brasil. Matrícula rápida e 100% online.",
};

export const viewport: Viewport = {
  themeColor: "#012169",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col bg-brand-bg text-brand-ink">
        <a
          href="#conteudo"
          className="sr-only rounded-lg focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-brand-ink focus:px-4 focus:py-2 focus:font-bold focus:text-white"
        >
          Pular para o conteúdo
        </a>
        <AuroraBackground />
        <AppHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
