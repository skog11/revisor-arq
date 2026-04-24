import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Consulta normativa — REVISOR ARQ",
  description:
    "Consulta la LGUC, la OGUC y las circulares DDU con respuestas verificables por artículo. Modos Arquitecto, Abogado y Profundo.",
  robots: { index: false, follow: false }, // chat no debe indexarse
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
