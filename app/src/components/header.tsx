"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/chat", label: "Consulta" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/corpus", label: "Corpus" },
];

export function Header() {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: "color-mix(in srgb, var(--paper) 92%, transparent)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <div className="flex items-center justify-between px-6 py-4 sm:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 no-underline" aria-label="REVISOR ARQ — Inicio">
            <div
              className="grid place-items-center rounded-[7px] text-xs font-semibold"
              style={{ width: 26, height: 26, background: "var(--ink)", color: "var(--paper)" }}
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

        {/* Nav desktop */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                "hover:bg-[var(--paper-2)] hover:text-[var(--ink)]",
                pathname === link.href ? "text-[var(--ink)]" : "text-[var(--ink-3)]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Acciones derecha */}
        <div className="flex items-center gap-2">
          <ModeToggle />
          {/* Botón hamburguesa — solo mobile */}
          <button
            className="flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-foreground/[0.06] md:hidden"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
          >
            {menuAbierto
              ? <X className="size-5" style={{ color: "var(--ink)" }} />
              : <Menu className="size-5" style={{ color: "var(--ink)" }} />
            }
          </button>
        </div>
      </div>

      {/* Menú mobile desplegable */}
      <AnimatePresence>
        {menuAbierto && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="border-t px-6 py-3 md:hidden"
            aria-label="Menú de navegación"
            style={{ borderColor: "var(--rule)", background: "var(--paper)" }}
          >
            <ul className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuAbierto(false)}
                    className={cn(
                      "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      "hover:bg-[var(--paper-2)]",
                      pathname === link.href ? "text-[var(--ink)]" : "text-[var(--ink-2)]"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
