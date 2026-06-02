"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silencioso — SW es mejora progresiva, no funcionalidad crítica
      });
    }
  }, []);

  return null;
}
