import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

import { AppHeader } from "@/components/ui/app-header";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "V7M Staff",
  title: "V7M Staff — administração da plataforma",
  description: "Painel administrativo da plataforma V7M / Supletivo Brasil.",
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
          <NuqsAdapter>
            <AppHeader />
            {children}
            <Toaster position="top-right" richColors />
          </NuqsAdapter>
        </QueryProvider>
      </body>
    </html>
  );
}
