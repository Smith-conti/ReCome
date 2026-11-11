import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ReCome — Salva comida y ahorra en Cusco",
    template: "%s · ReCome",
  },
  description:
    "ReCome conecta a consumidores con panaderías, cafeterías, restaurantes y otros comercios de Cusco que ofrecen excedentes de alimentos a precios más accesibles.",
  applicationName: "ReCome",
  keywords: [
    "ReCome",
    "desperdicio de alimentos",
    "excedentes",
    "Cusco",
    "ofertas gastronómicas",
    "consumo responsable",
    "ODS 12.3",
  ],
  authors: [{ name: "ReCome" }],
  openGraph: {
    type: "website",
    locale: "es_PE",
    siteName: "ReCome",
    title: "ReCome — Salva comida y ahorra en Cusco",
    description:
      "Reserva excedentes de alimentos de comercios locales de Cusco a precios más accesibles y recógelos en el establecimiento.",
    url: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#FFF9EF",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${fraunces.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
