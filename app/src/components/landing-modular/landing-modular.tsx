"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  type MotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { BookOpen, FileText, MessageCircle, Search, Settings, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { MagneticDock } from "@/components/ui/magnetic-dock";
import styles from "./landing-modular.module.css";

const DISTRICTS = [
  {
    id: "consulta",
    number: "01",
    title: "Consulta",
    detail: "Centro de inteligencia normativa",
    href: "/chat",
    icon: Search,
    lift: { x: 0, y: -18, rotate: 0 },
    asset: "/landing/districts/consulta.png",
    module: { left: "36%", top: "25%", width: "31%", height: "45%", zIndex: 5 },
    hotspot: { left: "38%", top: "28%", width: "27%", height: "40%" },
  },
  {
    id: "archivo",
    number: "02",
    title: "Archivo",
    detail: "Archivo normativo",
    href: "/archivo",
    icon: FileText,
    lift: { x: -15, y: -16, rotate: -0.8 },
    asset: "/landing/districts/archivo.png",
    module: { left: "21%", top: "-1%", width: "39%", height: "45%", zIndex: 2 },
    hotspot: { left: "23%", top: "2%", width: "35%", height: "40%" },
  },
  {
    id: "guias",
    number: "03",
    title: "Guías",
    detail: "Escuela de casos",
    href: "/guias",
    icon: BookOpen,
    lift: { x: 16, y: -15, rotate: 0.8 },
    asset: "/landing/districts/guias.png",
    module: { left: "55%", top: "7%", width: "36%", height: "44%", zIndex: 2 },
    hotspot: { left: "56%", top: "10%", width: "33%", height: "39%" },
  },
  {
    id: "metodo",
    number: "04",
    title: "Cómo funciona",
    detail: "Taller de metodología",
    href: "/como-funciona",
    icon: Settings,
    lift: { x: -17, y: 6, rotate: -0.7 },
    asset: "/landing/districts/metodo.png",
    module: { left: "8%", top: "29%", width: "34%", height: "38%", zIndex: 1 },
    hotspot: { left: "10%", top: "31%", width: "31%", height: "34%" },
  },
  {
    id: "cuenta",
    number: "05",
    title: "Mi cuenta",
    detail: "Oficina personal",
    href: "/dashboard",
    icon: UserRound,
    lift: { x: 16, y: 9, rotate: 0.7 },
    asset: "/landing/districts/cuenta.png",
    module: { left: "56%", top: "52%", width: "34%", height: "43%", zIndex: 4 },
    hotspot: { left: "58%", top: "54%", width: "31%", height: "39%" },
  },
  {
    id: "contacto",
    number: "06",
    title: "Contacto",
    detail: "Centro de atención",
    href: "/contacto",
    icon: MessageCircle,
    lift: { x: -13, y: 11, rotate: -0.7 },
    asset: "/landing/districts/contacto.png",
    module: { left: "28%", top: "53%", width: "32%", height: "41%", zIndex: 4 },
    hotspot: { left: "30%", top: "55%", width: "29%", height: "36%" },
  },
] as const;

const DOCUMENTS = [
  { id: "plan-regulador", kind: "sheet", box: [34, -20, 500, 580], x: -104, y: -28, rotate: -11, baseRotate: -7, wave: 1, depth: 8 },
  { id: "certificado", kind: "sheet", box: [300, -12, 390, 340], x: -96, y: -64, rotate: -8, baseRotate: -5, wave: 0, depth: 6 },
  { id: "dictamen-cgr", kind: "sheet", box: [120, 175, 430, 510], x: -106, y: -40, rotate: -14, baseRotate: -8, wave: 2, depth: 14 },
  { id: "rasante", kind: "sheet", box: [205, 430, 440, 340], x: -102, y: 44, rotate: -10, baseRotate: -4, wave: 2, depth: 12 },
  { id: "cuadro-normativo", kind: "sheet", box: [-44, 570, 470, 370], x: -108, y: 78, rotate: -8, baseRotate: -6, wave: 0, depth: 10 },
  { id: "subdivision-predial", kind: "sheet", box: [300, 650, 470, 310], x: -94, y: 105, rotate: -7, baseRotate: 3, wave: 3, depth: 13 },
  { id: "croquis-emplazamiento", kind: "sheet", box: [45, 392, 490, 370], x: -110, y: 34, rotate: -9, baseRotate: 5, wave: 3, depth: 11 },
  { id: "plano-edificacion", kind: "sheet", box: [1130, -28, 500, 470], x: 104, y: -64, rotate: 8, baseRotate: 4, wave: 1, depth: 5 },
  { id: "planta-arquitectura", kind: "sheet", box: [1328, 0, 520, 480], x: 112, y: -42, rotate: 10, baseRotate: 7, wave: 2, depth: 7 },
  { id: "ordenanza-local", kind: "sheet", box: [1400, 84, 350, 510], x: 104, y: -24, rotate: 12, baseRotate: 6, wave: 0, depth: 9 },
  { id: "distanciamientos", kind: "sheet", box: [1110, 170, 500, 420], x: 108, y: -18, rotate: 9, baseRotate: 3, wave: 1, depth: 15 },
  { id: "informe-tecnico", kind: "sheet", box: [1210, 300, 470, 440], x: 112, y: 24, rotate: 12, baseRotate: 5, wave: 2, depth: 16 },
  { id: "permiso-edificacion", kind: "sheet", box: [1320, 450, 400, 410], x: 108, y: 58, rotate: 10, baseRotate: 4, wave: 1, depth: 12 },
  { id: "recepcion-definitiva", kind: "sheet", box: [1095, 560, 420, 410], x: 104, y: 102, rotate: 11, baseRotate: 5, wave: 3, depth: 14 },
  { id: "memoria-calculo", kind: "sheet", box: [1250, 600, 430, 390], x: 98, y: 112, rotate: 9, baseRotate: -3, wave: 3, depth: 13 },
  { id: "elevacion-oriente", kind: "sheet", box: [1045, 690, 610, 310], x: 104, y: 118, rotate: 7, baseRotate: 4, wave: 0, depth: 8 },
  { id: "regla", kind: "tool", box: [40, 118, 720, 92], x: -108, y: -88, rotate: -14, baseRotate: -8, wave: 1, depth: 20 },
  { id: "lapiz-rojo", kind: "tool", box: [175, 242, 620, 78], x: -110, y: 30, rotate: -18, baseRotate: 58, wave: 2, depth: 22 },
  { id: "lapiz-negro", kind: "tool", box: [1060, 260, 620, 78], x: 112, y: 46, rotate: 16, baseRotate: -54, wave: 3, depth: 23 },
] as const;

function ArchitecturalMark() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true">
      <path d="M5 4h20v35H5zM11 10l25 17v12H11zM11 10v29M25 4v35" />
    </svg>
  );
}

function DocumentSheet({
  document,
  progress,
}: {
  document: (typeof DOCUMENTS)[number];
  progress: MotionValue<number>;
}) {
  const start = [0.18, 0.22, 0.27, 0.32][document.wave];
  const opening = [0.34, 0.39, 0.45, 0.51][document.wave];
  const exit = [0.62, 0.68, 0.76, 0.83][document.wave];
  const x = useTransform(
    progress,
    [0, start, opening, exit],
    ["0vw", "0vw", `${document.x * 0.32}vw`, `${document.x * 0.9}vw`],
  );
  const y = useTransform(
    progress,
    [0, start, opening, exit],
    ["0vh", "0vh", `${document.y * 0.24}vh`, `${document.y * 0.86}vh`],
  );
  const rotate = useTransform(
    progress,
    [0, opening, exit],
    [document.baseRotate, document.baseRotate + document.rotate * 0.35, document.baseRotate + document.rotate],
  );
  const scale = useTransform(progress, [0, opening, exit], [1, 1.015, 1.045]);
  const opacity = useTransform(progress, [0, start, exit - 0.05, exit], [1, 1, 0.95, 0]);
  const [left, top, width, height] = document.box;

  return (
    <motion.div
      className={styles.documentSheet}
      style={{
        left: `${(left / 1672) * 100}%`,
        top: `${(top / 941) * 100}%`,
        width: `${(width / 1672) * 100}%`,
        height: `${(height / 941) * 100}%`,
        zIndex: document.depth,
        x,
        y,
        rotate,
        scale,
        opacity,
      }}
      aria-hidden="true"
    >
      <Image
        src={`/landing/documents-v2/${document.id}.png`}
        alt=""
        fill
        sizes="35vw"
        className={document.kind === "tool" ? styles.documentTool : styles.documentImage}
      />
    </motion.div>
  );
}

export function LandingModular() {
  const chapterRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const [manualDistrict, setManualDistrict] = useState<number | null>(null);
  const [introCleared, setIntroCleared] = useState(false);
  const { scrollYProgress } = useScroll({
    target: chapterRef,
    offset: ["start start", "end end"],
  });
  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (reducedMotion) return;
    setIntroCleared(progress >= 0.87);
  });

  const sceneOpacity = useTransform(scrollYProgress, [0.78, 0.86], [1, 0]);
  const surfaceOpacity = useTransform(
    scrollYProgress,
    [0, 0.58, 0.74, 0.86],
    [0, 0, 0.46, 1],
  );
  const surfaceScale = useTransform(scrollYProgress, [0, 0.52, 0.86], [0.88, 0.95, 1]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.06, 0.16], [1, 1, 0]);
  const cueY = useTransform(scrollYProgress, [0, 0.16], [0, 18]);
  const introCopyOpacity = useTransform(scrollYProgress, [0, 0.27, 0.5, 0.6], [1, 1, 0.75, 0]);
  const introCopyY = useTransform(scrollYProgress, [0, 0.6], [0, -42]);
  const introCityOpacity = useTransform(scrollYProgress, [0, 0.2, 0.42, 0.72, 0.8], [0, 0, 1, 1, 0]);
  const introCityScale = useTransform(scrollYProgress, [0.2, 0.72], [0.56, 1]);
  const activeDistrict = manualDistrict;

  return (
    <div className={styles.landing}>
      <section ref={chapterRef} className={styles.chapter} aria-labelledby="landing-title">
        <div className={styles.sticky}>
          <motion.div
            className={styles.finalSurface}
            style={{
              opacity: reducedMotion || introCleared ? 1 : surfaceOpacity,
              scale: reducedMotion ? 1 : surfaceScale,
            }}
          >
            <header className={styles.header}>
              <Link href="/" className={styles.brand} aria-label="REVISOR ARQ, inicio">
                <ArchitecturalMark />
                <span className={styles.brandName}>REVISOR ARQ</span>
              </Link>
              <div className={styles.headerActions}>
                <Link href="/login" className={styles.login}>Ingresar</Link>
                <Link href="/chat" className={styles.headerCta}>
                  Iniciar consulta <span aria-hidden="true">→</span>
                </Link>
              </div>
            </header>

            <div className={styles.hero}>
              <div className={styles.copy}>
                <p className={styles.eyebrow}>Inteligencia regulatoria con fuentes</p>
                <h1 id="landing-title">REVISOR ARQ</h1>
                <p className={styles.productClaim}>Consulta normativa.<br />Respuestas verificables.</p>
                <p className={styles.description}>
                  REVISOR ARQ integra fuentes de distintas especialidades y responde
                  con el tipo de norma, el artículo y el fragmento literal que sustentan
                  cada conclusión.
                </p>
                <p className={styles.trust}>
                  <span aria-hidden="true">✓</span>
                  Si no encuentra respaldo normativo verificable, lo declara explícitamente.
                </p>
                <div className={styles.copyActions}>
                  <Link href="/chat" className={styles.primaryAction}>Analizar un predio <span>→</span></Link>
                  <Link href="/archivo" className={styles.secondaryAction}>Explorar fuentes</Link>
                </div>
              </div>

              <div className={styles.cityWrap} aria-label="Ciudad modular de navegación">
                <div className={styles.cityStage}>
                  <Image
                    src="/landing/ciudad-modular-limpia.png"
                    alt="Ciudad modular de REVISOR ARQ"
                    fill
                    priority
                    sizes="(max-width: 780px) 100vw, 68vw"
                    className={styles.cityBase}
                  />

                  <div className={styles.hotspots}>
                    {DISTRICTS.map((district, index) => (
                      <Link
                        key={district.id}
                        href={district.href}
                        className={styles.hotspot}
                        style={district.hotspot}
                        data-active={activeDistrict === index}
                        onPointerEnter={() => setManualDistrict(index)}
                        onPointerLeave={() => setManualDistrict(null)}
                        onFocus={() => setManualDistrict(index)}
                        onBlur={() => setManualDistrict(null)}
                      >
                        <span className={styles.hotspotLabel}>
                          <strong>{district.title}</strong>
                          <small>{district.detail}</small>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <MagneticDock
              className={styles.dockPosition}
              ariaLabel="Destinos de REVISOR ARQ"
              iconSize={68}
              maxScale={1.42}
              items={DISTRICTS.map((district, index) => {
                const Icon = district.icon;

                return {
                  id: district.id,
                  number: district.number,
                  label: district.title,
                  detail: district.detail,
                  href: district.href,
                  icon: <Icon aria-hidden="true" />,
                  isActive: (activeDistrict ?? 0) === index,
                  onPointerEnter: () => setManualDistrict(index),
                  onPointerLeave: () => setManualDistrict(null),
                  onFocus: () => setManualDistrict(index),
                  onBlur: () => setManualDistrict(null),
                };
              })}
            />
          </motion.div>

          {!reducedMotion && !introCleared && (
            <motion.div
              className={styles.introScene}
              data-cleared={introCleared}
              style={{ opacity: sceneOpacity }}
              aria-hidden="true"
            >
              <div className={styles.documentField}>
                <div className={styles.documentPlane}>
                  {DOCUMENTS.map((document) => (
                    <DocumentSheet key={document.id} document={document} progress={scrollYProgress} />
                  ))}
                </div>
              </div>
              <motion.div
                className={styles.introCity}
                style={{ opacity: introCityOpacity, scale: introCityScale }}
              >
                <Image
                  src="/landing/ciudad-modular-limpia.png"
                  alt=""
                  fill
                  sizes="60vw"
                  className={styles.introCityImage}
                />
              </motion.div>
              <motion.div
                className={styles.introCopy}
                style={{ opacity: introCopyOpacity, y: introCopyY }}
              >
                <div className={styles.introBrand}>
                  <ArchitecturalMark />
                  <span>REVISOR ARQ</span>
                </div>
                <h2>Consulta normativa.<br />Respuestas verificables.</h2>
                <p>
                  Fuentes de distintas especialidades, con tipo de norma, articulo y
                  fragmento literal de respaldo.
                </p>
                <div className={styles.introTrust}>
                  <span aria-hidden="true">&#10003;</span>
                  Si no existe respaldo normativo verificable, lo declara explicitamente.
                </div>
              </motion.div>
              <motion.div className={styles.scrollCue} style={{ opacity: cueOpacity, y: cueY }}>
                <span className={styles.scrollMouse} aria-hidden="true"><i /></span>
                <strong>Desplaza para ingresar</strong>
                <small>Abre el expediente normativo</small>
              </motion.div>
            </motion.div>
          )}
        </div>
      </section>

    </div>
  );
}
