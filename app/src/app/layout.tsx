import type { Metadata } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CookieBanner } from "@/components/cookie-banner";
import { Analytics } from "@vercel/analytics/next";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://revisor-arq.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "REVISOR ARQ — Normativa urbana chilena",
    template: "%s — REVISOR ARQ",
  },
  description:
    "Consulta LGUC, OGUC y DDU con respuestas verificables que citan el artículo exacto. Para arquitectos y abogados en Chile.",
  keywords: ["LGUC", "OGUC", "DDU", "normativa urbana", "arquitectura Chile", "urbanismo"],
  openGraph: {
    title: "REVISOR ARQ — Normativa urbana chilena",
    description: "Normativa urbana chilena, respondida con fuentes verificables. LGUC · OGUC · DDU.",
    type: "website",
    url: BASE_URL,
    siteName: "REVISOR ARQ",
    locale: "es_CL",
  },
  twitter: {
    card: "summary_large_image",
    title: "REVISOR ARQ — Normativa urbana chilena",
    description: "Consulta LGUC, OGUC y DDU con respuestas verificables.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background text-foreground antialiased",
          instrumentSerif.variable,
          inter.variable,
          jetbrainsMono.variable,
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <CookieBanner />
            <Analytics />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
