"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

const DURACION_APERTURA_MS = 6100;
const DURACION_SALIDA_MS = 460;

/**
 * Apertura cinematográfica de la landing.
 *
 * El último plano usa la misma imagen que CiudadHero, de modo que la
 * desaparición del libro se convierte en una transición continua al sitio.
 */
export function IntroduccionPopup() {
  const [visible, setVisible] = useState(true);
  const [saliendo, setSaliendo] = useState(false);
  const cerrandoRef = useRef(false);
  const salidaRef = useRef<number | null>(null);
  const overflowAnteriorRef = useRef("");

  const cerrar = useCallback(() => {
    if (cerrandoRef.current) return;

    cerrandoRef.current = true;
    setSaliendo(true);
    salidaRef.current = window.setTimeout(() => {
      document.body.style.overflow = overflowAnteriorRef.current;
      setVisible(false);
    }, DURACION_SALIDA_MS);
  }, []);

  useEffect(() => {
    const movimientoReducido = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (movimientoReducido) {
      setVisible(false);
      return;
    }

    overflowAnteriorRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const apertura = window.setTimeout(cerrar, DURACION_APERTURA_MS);
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") cerrar();
    };

    window.addEventListener("keydown", cerrarConEscape);

    return () => {
      window.clearTimeout(apertura);
      if (salidaRef.current !== null) window.clearTimeout(salidaRef.current);
      window.removeEventListener("keydown", cerrarConEscape);
      document.body.style.overflow = overflowAnteriorRef.current;
    };
  }, [cerrar]);

  if (!visible) return null;

  return (
    <div
      className={`ra-intro ${saliendo ? "ra-intro--saliendo" : ""}`}
      aria-label="Introducción animada: la ciudad normativa emerge de un libro"
    >
      <div className="ra-intro__mesa" aria-hidden="true" />

      <button className="ra-intro__omitir" type="button" onClick={cerrar}>
        Omitir introducción
        <span aria-hidden="true">Esc</span>
      </button>

      <div className="ra-intro__escena" aria-hidden="true">
        <div className="ra-intro__libro">
          <div className="ra-intro__sombra" />

          <div className="ra-intro__paginas">
            <div className="ra-intro__pagina ra-intro__pagina--izquierda">
              <span className="ra-intro__folio">01</span>
              <span className="ra-intro__lineas" />
            </div>
            <div className="ra-intro__pagina ra-intro__pagina--derecha">
              <span className="ra-intro__folio">02</span>
              <span className="ra-intro__lineas" />
            </div>
            <div className="ra-intro__lomo" />
          </div>

          <div className="ra-intro__ciudad">
            <Image
              src="/ciudad/ciudad-hero-v4.png"
              alt=""
              fill
              priority
              quality={96}
              sizes="(max-width: 767px) 94vw, min(88vw, 1080px)"
              className="object-cover"
            />
            <span className="ra-intro__pliegue" />
          </div>

          <div className="ra-intro__portada">
            <div className="ra-intro__portada-frente">
              <span className="ra-intro__coleccion">Atlas del territorio</span>
              <span className="ra-intro__marca">
                REVISOR <em>ARQ</em>
              </span>
              <span className="ra-intro__filete" />
              <span className="ra-intro__subtitulo">
                La normativa que gobierna la ciudad
              </span>
              <span className="ra-intro__edicion">CHILE · EDICIÓN 2026</span>
            </div>
            <div className="ra-intro__portada-reverso">
              <span />
            </div>
          </div>
        </div>
      </div>

      <p className="ra-intro__leyenda" aria-hidden="true">
        La ciudad emerge de sus normas.
      </p>
    </div>
  );
}
