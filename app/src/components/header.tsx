"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/",        label: "Home"      },
  { href: "/chat",    label: "Consulta"  },
  { href: "/corpus",  label: "Normativa" },
];

export function Header() {
  const pathname  = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background:    "var(--paper)",
        borderBottom:  "1px solid var(--rule)",
      }}
    >
      <div className="flex items-center justify-between px-6 py-4 sm:px-10">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-3 no-underline group">
          {/* Plano arquitectónico minimalista */}
          <div className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            <svg viewBox="0 0 24 24" fill="none" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
              <rect x="2"  y="3"  width="8"  height="10" rx="1" stroke="var(--mode-arq)" strokeWidth="1.1"/>
              <rect x="4"  y="5"  width="4"  height="3"  rx=".5" stroke="var(--mode-arq)" strokeWidth=".8" opacity=".6"/>
              <line x1="4"  y1="10" x2="8"  y2="10" stroke="var(--mode-arq)" strokeWidth=".7" opacity=".4"/>
              <rect x="12" y="6"  width="10" height="7"  rx="1" stroke="var(--mode-arq)" strokeWidth="1.1" opacity=".5"/>
              <line x1="12" y1="10" x2="22" y2="10" stroke="var(--mode-arq)" strokeWidth=".7" opacity=".3"/>
              <line x1="17" y1="6"  x2="17" y2="13" stroke="var(--mode-arq)" strokeWidth=".7" opacity=".3"/>
              <line x1="2"  y1="17" x2="22" y2="17" stroke="var(--mode-arq)" strokeWidth=".8" opacity=".16"/>
            </svg>
          </div>

          {/* Nombre */}
          <div className="flex items-baseline gap-2.5">
            <span
              style={{
                fontFamily:    "var(--font-instrument-serif)",
                fontSize:      15,
                letterSpacing: "0.01em",
                color:         "var(--ink)",
              }}
            >
              REVISOR ARQ
            </span>
            <span
              className="hidden sm:inline"
              style={{
                fontFamily:    "var(--font-jetbrains-mono)",
                fontSize:      8.5,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color:         "var(--ink-5)",
                paddingLeft:   10,
                borderLeft:    "1px solid var(--rule-2)",
              }}
            >
              beta
            </span>
          </div>
        </Link>

        {/* ── Nav desktop ── */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-[13px] transition-colors duration-150",
                "hover:bg-foreground/[0.04]",
                pathname === link.href
                  ? "text-[var(--ink)] font-medium"
                  : "text-[var(--ink-3)] hover:text-[var(--ink-2)]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ── Acciones ── */}
        <div className="flex items-center gap-2">
          <ModeToggle />

          {/* Hamburguesa */}
          <button
            className="flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-foreground/[0.05] md:hidden"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
          >
            {menuAbierto
              ? <X    className="size-5" style={{ color: "var(--ink)" }} />
              : <Menu className="size-5" style={{ color: "var(--ink)" }} />
            }
          </button>
        </div>
      </div>

      {/* ── Menú mobile ── */}
      {menuAbierto && (
        <nav
          className="border-t px-6 pb-3 pt-2 md:hidden"
          style={{ borderColor: "var(--rule)", background: "var(--paper)" }}
        >
          <ul className="flex flex-col gap-0.5">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuAbierto(false)}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-foreground/[0.04]",
                    pathname === link.href
                      ? "text-[var(--ink)] font-medium"
                      : "text-[var(--ink-2)]"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 border-t pt-2" style={{ borderColor: "var(--rule)" }}>
              <Link
                href="/chat"
                onClick={() => setMenuAbierto(false)}
                className="block rounded-md px-3 py-2.5 text-sm font-medium text-center transition-colors"
                style={{ background: "var(--ink)", color: "var(--paper)" }}
              >
                Consultar
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
