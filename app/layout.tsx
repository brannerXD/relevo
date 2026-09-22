import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Offline } from "@/components/Offline";

const titulo = Fraunces({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--fuente-titulo",
  display: "swap",
});

const cuerpo = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--fuente-cuerpo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Relevo",
  description: "Tú con lo importante. Nosotros con los papeles.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Relevo", statusBarStyle: "default" },
  icons: {
    // El SVG primero: es nítido a cualquier tamaño y pesa menos de 1 KB. El
    // PNG de 32 queda de respaldo para los navegadores que todavía no sirven
    // bien un favicon vectorial.
    icon: [
      { url: "/icono", type: "image/svg+xml" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF6F1",
  width: "device-width",
  initialScale: 1,
  // Sin maximumScale: bloquear el zoom en una app para gente de 55 años
  // sería exactamente lo contrario de lo que estamos haciendo.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CO" className={`${titulo.variable} ${cuerpo.variable}`}>
      <body className="font-cuerpo bg-arena text-tinta antialiased">
        {children}
        <Offline />
      </body>
    </html>
  );
}
