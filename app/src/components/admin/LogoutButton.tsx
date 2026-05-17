"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-foreground/[0.06]"
      style={{ border: "1px solid var(--rule)", color: "var(--ink-3)" }}
    >
      <LogOut className="size-3.5" />
      Salir
    </button>
  );
}
