import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

import { BackgroundGradient } from "@/components/ui/background-gradient";

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
      <body className="min-h-full flex flex-col bg-brand-bg text-brand-ink">
        <BackgroundGradient />
        {children}
      </body>
    </html>
  );
}
