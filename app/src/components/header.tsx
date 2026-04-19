"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/chat", label: "Consulta" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "/corpus", label: "Corpus" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-8 py-4"
      style={{
        background: "color-mix(in srgb, var(--paper) 92%, transparent)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div
            className="grid place-items-center rounded-[7px] text-xs font-semibold"
            style={{
              width: 26,
              height: 26,
              background: "var(--ink)",
              color: "var(--paper)",
            }}
          >
            R
          </div>
          <span
            className="text-2xl tracking-[-0.5px]"
            style={{ fontFamily: "var(--font-instrument-serif)", color: "var(--ink)" }}
          >
            REVISOR ARQ
          </span>
        </Link>
        <span
          className="ml-1 hidden sm:inline"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: 10,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "1.4px",
            paddingLeft: 14,
            marginLeft: 4,
            borderLeft: "1px solid var(--rule-2)",
          }}
        >
          beta
        </span>
      </div>

      {/* Nav */}
      <nav className="hidden items-center gap-1 md:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              "hover:bg-[var(--paper-2)] hover:text-[var(--ink)]",
              pathname === link.href
                ? "text-[var(--ink)]"
                : "text-[var(--ink-3)]",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <ModeToggle />
        <Link
          href="/chat"
          className="hidden rounded-full px-4 py-2 text-sm font-medium transition-all hover:-translate-y-px sm:inline-flex"
          style={{
            background: "var(--ink)",
            color: "var(--paper)",
            border: "1px solid var(--ink)",
          }}
        >
          Probar consulta
        </Link>
      </div>
    </header>
  );
}
