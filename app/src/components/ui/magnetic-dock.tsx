"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import styles from "./magnetic-dock.module.css";

export type MagneticDockItem = {
  id: string;
  number: string;
  label: string;
  detail: string;
  href: string;
  icon: ReactNode;
  isActive?: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

type DockItemProps = {
  item: MagneticDockItem;
  mouseX: MotionValue<number>;
  iconSize: number;
  maxScale: number;
  magneticDistance: number;
};

function DockItem({ item, mouseX, iconSize, maxScale, magneticDistance }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [showLabel, setShowLabel] = useState(false);
  const distance = useTransform(mouseX, (value) => {
    if (!ref.current || reducedMotion) return magneticDistance + 1;
    const bounds = ref.current.getBoundingClientRect();
    return value - (bounds.left + bounds.width / 2);
  });
  const scale = useTransform(
    distance,
    [-magneticDistance, 0, magneticDistance],
    [1, maxScale, 1],
  );
  const smoothScale = useSpring(scale, { damping: 22, stiffness: 290, mass: 0.48 });
  const size = useTransform(smoothScale, (value) => value * iconSize);
  const lift = useTransform(smoothScale, (value) => (value - 1) * -18);

  const activate = () => {
    setShowLabel(true);
    item.onPointerEnter?.();
  };

  const deactivate = () => {
    setShowLabel(false);
    item.onPointerLeave?.();
  };

  return (
    <motion.div
      ref={ref}
      className={styles.item}
      style={{ width: size, height: size, y: lift }}
      whileTap={reducedMotion ? undefined : { scale: 0.94 }}
      data-active={item.isActive}
    >
      <Link
        href={item.href}
        className={styles.link}
        aria-label={`${item.label}: ${item.detail}`}
        onPointerEnter={activate}
        onPointerLeave={deactivate}
        onFocus={() => {
          setShowLabel(true);
          item.onFocus?.();
        }}
        onBlur={() => {
          setShowLabel(false);
          item.onBlur?.();
        }}
      >
        <span className={styles.sheet}>
          <span className={styles.number}>{item.number}</span>
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.shine} aria-hidden="true" />
        </span>
        <span className={styles.mobileCopy}>
          <strong>{item.label}</strong>
          <small>{item.detail}</small>
        </span>
        <span className={styles.activeRule} aria-hidden="true" />

        <AnimatePresence>
          {showLabel && (
            <motion.span
              className={styles.tooltip}
              initial={{ opacity: 0, y: 8, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              <small>{item.number} / DESTINO</small>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
              <i aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    </motion.div>
  );
}

export function MagneticDock({
  items,
  className,
  ariaLabel = "Navegación principal",
  iconSize = 54,
  maxScale = 1.48,
  magneticDistance = 132,
}: {
  items: MagneticDockItem[];
  className?: string;
  ariaLabel?: string;
  iconSize?: number;
  maxScale?: number;
  magneticDistance?: number;
}) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.nav
      className={cn(styles.dock, className)}
      aria-label={ariaLabel}
      onPointerMove={(event) => mouseX.set(event.clientX)}
      onPointerLeave={() => mouseX.set(Infinity)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className={styles.draftingLine} aria-hidden="true" />
      {items.map((item) => (
        <DockItem
          key={item.id}
          item={item}
          mouseX={mouseX}
          iconSize={iconSize}
          maxScale={maxScale}
          magneticDistance={magneticDistance}
        />
      ))}
    </motion.nav>
  );
}
