import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel de normativa",
  description: "Administración del corpus normativo de REVISOR ARQ.",
  robots: { index: false, follow: false },
};

export default function NormativaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
