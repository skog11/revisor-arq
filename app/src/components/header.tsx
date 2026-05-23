"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, User, LogOut, LayoutDashboard } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const NAV_LINKS = [
  { href: "/",        label: "Home"      },
  { href: "/chat",    label: "Consulta"  },
  { href: "/corpus",  label: "Normativa" },
];

// ─── Avatar pequeño ──────────────────────────────────────────────────────────

function AvatarMenu({ user }: { user: SupabaseUser }) {
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();
  const inicial = (user.user_metadata?.nombre ?? user.email ?? "?")[0].toUpperCase();

  async function handleLogout() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center justify-center size-7 rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
        style={{ background: "var(--terracotta)", color: "#fff", fontFamily: "var(--font-jetbrains-mono)" }}
        title={user.email ?? "Mi cuenta"}
        aria-label="Menú de cuenta"
      >
        {inicial}
      </button>

      {abierto && (
        <>
          {/* Overlay para cerrar */}
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />

          {/* Dropdown */}
          <div
            className="absolute right-0 top-9 z-50 w-52 rounded-xl overflow-hidden"
            style={{
              background: "var(--paper)",
              border: "1px solid var(--rule)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
            }}
          >
            {/* Info usuario */}
            <div className="px-3.5 py-3 border-b" style={{ borderColor: "var(--rule)" }}>
              <p className="text-xs font-medium truncate" style={{ color: "var(--ink)" }}>
                {user.user_metadata?.nombre ?? user.email?.split("@")[0]}
              </p>
              <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--ink-4)", fontFamily: "var(--font-jetbrains-mono)" }}>
                {user.email}
              </p>
            </div>

            {/* Links */}
            <nav className="py-1">
              <Link
                href="/dashboard"
                onClick={() => setAbierto(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors hover:bg-foreground/[0.04]"
                style={{ color: "var(--ink-2)" }}
              >
                <LayoutDashboard className="size-3.5" style={{ color: "var(--ink-4)" }} />
                Mi dashboard
              </Link>
              <button
                onClick={() => { setAbierto(false); handleLogout(); }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs transition-colors hover:bg-foreground/[0.04]"
                style={{ color: "var(--ink-2)" }}
              >
                <LogOut className="size-3.5" style={{ color: "var(--ink-4)" }} />
                Cerrar sesión
              </button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Header principal ─────────────────────────────────────────────────────────

export function Header() {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  // Obtener sesión actual y suscribirse a cambios
  useEffect(() => {
    const supabase = getSupabaseBrowser();

    supabase.auth.getSession().then(({ data }: { data: { session: { user: SupabaseUser } | null } }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: { user: SupabaseUser } | null) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background:   "var(--paper)",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <div className="flex items-center justify-between px-6 py-4 sm:px-10">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-3 no-underline group">
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
          <div className="flex items-baseline gap-2.5">
            <span style={{ fontFamily: "var(--font-instrument-serif)", fontSize: 15, letterSpacing: "0.01em", color: "var(--ink)" }}>
              REVISOR ARQ
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

        {/* ── Acciones desktop ── */}
        <div className="hidden md:flex items-center gap-3">
          <ModeToggle />

          {user ? (
            <AvatarMenu user={user} />
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors hover:bg-foreground/[0.05]"
              style={{ color: "var(--ink-3)" }}
            >
              <User className="size-3.5" />
              Ingresar
            </Link>
          )}
        </div>

        {/* ── Acciones mobile ── */}
        <div className="flex items-center gap-2 md:hidden">
          <ModeToggle />
          {user && <AvatarMenu user={user} />}
          <button
            className="flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-foreground/[0.05]"
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
            {!user && (
              <li className="mt-2 border-t pt-2" style={{ borderColor: "var(--rule)" }}>
                <Link
                  href="/login"
                  onClick={() => setMenuAbierto(false)}
                  className="block rounded-md px-3 py-2.5 text-sm font-medium text-center transition-colors"
                  style={{ background: "var(--ink)", color: "var(--paper)" }}
                >
                  Ingresar
                </Link>
              </li>
            )}
            {user && (
              <li className="mt-2 border-t pt-2" style={{ borderColor: "var(--rule)" }}>
                <Link
                  href="/dashboard"
                  onClick={() => setMenuAbierto(false)}
                  className="block rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-foreground/[0.04]"
                  style={{ color: "var(--ink-2)" }}
                >
                  Mi dashboard
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
