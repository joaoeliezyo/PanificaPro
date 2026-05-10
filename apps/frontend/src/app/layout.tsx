import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PanificaPro",
  description: "Sistema de Gerenciamento de Produção para Padarias",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
