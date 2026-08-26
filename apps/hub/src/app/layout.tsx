import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/layout/providers";

export const metadata: Metadata = {
  title: "Hub do Polo | V7M",
  description: "Painel do Coordenador de Polo: filas de revisão, decisões e matrículas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-brand-bg text-brand-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
