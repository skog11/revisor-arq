import type { Metadata } from "next";
import { LandingModular } from "@/components/landing-modular/landing-modular";

export const metadata: Metadata = {
  title: "REVISOR ARQ — vista previa landing modular",
  robots: { index: false, follow: false },
};

export default function LandingModularPage() {
  return <LandingModular />;
}