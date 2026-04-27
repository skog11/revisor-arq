import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Reporta errores en la base normativa, sugiere mejoras o consulta sobre REVISOR ARQ.",
};

export default function ContactoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
