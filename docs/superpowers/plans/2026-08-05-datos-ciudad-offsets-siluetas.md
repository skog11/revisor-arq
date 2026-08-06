# Datos de la ciudad — offsets y siluetas · Plan de implementación

> **Para trabajadores agénticos:** SUB-SKILL REQUERIDA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** Producir `datos-ciudad.ts` con la posición real al pixel y la silueta clicable de las seis manzanas, calculadas desde las imágenes en vez de estimadas a ojo.

**Arquitectura:** Dos módulos de lógica pura sin dependencias de imagen (`registro-imagen.ts` y `silueta-alfa.ts`), probados con vitest sobre mapas de bytes sintéticos, más un script CLI que usa sharp para leer los PNG reales, los pasa por esos módulos y emite el archivo de datos. La separación existe para que la lógica sea testeable sin tocar archivos.

**Stack:** TypeScript, vitest (entorno `node`), sharp 0.34.5, tsx.

**Por qué este plan va primero:** sin offsets reales no se puede validar si el video piloto calza sobre la base. Es el desbloqueo del camino crítico.

---

## Contexto que el implementador necesita

**El problema.** `public/landing/ciudad-modular-limpia.png` mide 1672×941. Los seis recortes en `public/landing/districts/` fueron cortados de esa imagen pero tienen tamaños distintos y **nadie registró de qué posición salieron**:

| Recorte | Tamaño |
|---|---|
| `archivo.png` | 1214×868 |
| `consulta.png` | 963×880 |
| `contacto.png` | 982×786 |
| `cuenta.png` | 1124×899 |
| `guias.png` | 1132×840 |
| `metodo.png` | 989×775 |

Hoy `src/components/landing-modular/landing-modular.tsx:28` los posiciona con porcentajes estimados a ojo (`module: { left: "36%", top: "25%", ... }`). Con imágenes fijas casi no se nota. Cuando el PNG se reemplace por un video en hover, la manzana saltará unos píxeles y se verá una costura.

**La solución.** Los recortes salieron de la base, así que los píxeles opacos deben coincidir casi exactamente. Se busca la posición donde la diferencia es mínima.

**Por qué grueso-a-fino.** Buscar a resolución completa sería ~44.000 posiciones × ~850.000 píxeles cada una. Inviable. Se reduce todo 8× para una búsqueda gruesa barata, y luego se refina a resolución completa solo en una ventana pequeña alrededor del ganador.

**Por qué la máscara alfa importa.** Los recortes son RGBA con fondo transparente. Comparar píxeles transparentes contra la base metería ruido. Solo se comparan píxeles con alfa ≥ 128.

**Convención de tests del repo.** Los tests unitarios viven en `src/__tests__/*.test.ts` y corren con `npm test` (vitest, entorno `node`, alias `@` → `src`). No hay jsdom ni `@testing-library/react`: **no intentes testear componentes React en este plan.**

---

### Tarea 1: Módulo de registro — reducción de mapas

**Archivos:**
- Crear: `app/src/lib/landing/registro-imagen.ts`
- Test: `app/src/__tests__/registro-imagen.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

Crear `app/src/__tests__/registro-imagen.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { reducir, type MapaGris } from "@/lib/landing/registro-imagen";

function mapa(ancho: number, alto: number, f: (x: number, y: number) => number): MapaGris {
  const datos = new Uint8Array(ancho * alto);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      datos[y * ancho + x] = f(x, y);
    }
  }
  return { datos, ancho, alto };
}

describe("reducir", () => {
  it("divide las dimensiones por el factor", () => {
    const original = mapa(16, 8, () => 100);
    const chico = reducir(original, 4);
    expect(chico.ancho).toBe(4);
    expect(chico.alto).toBe(2);
  });

  it("promedia los bloques", () => {
    const original = mapa(2, 2, (x, y) => (x === 0 && y === 0 ? 200 : 0));
    const chico = reducir(original, 2);
    expect(chico.ancho).toBe(1);
    expect(chico.alto).toBe(1);
    expect(chico.datos[0]).toBe(50);
  });

  it("nunca devuelve dimensiones cero", () => {
    const original = mapa(3, 3, () => 10);
    const chico = reducir(original, 10);
    expect(chico.ancho).toBe(1);
    expect(chico.alto).toBe(1);
  });
});
```

- [ ] **Paso 2: Correr el test y verificar que falla**

```bash
cd app && npm test -- registro-imagen
```

Esperado: FAIL con `Failed to resolve import "@/lib/landing/registro-imagen"`.

- [ ] **Paso 3: Escribir la implementación mínima**

Crear `app/src/lib/landing/registro-imagen.ts`:

```ts
/**
 * Registro de recortes contra la imagen base de la ciudad.
 * Lógica pura sobre mapas de bytes: no lee archivos ni depende de sharp,
 * para poder probarse con datos sintéticos.
 */

export type MapaGris = {
  datos: Uint8Array;
  ancho: number;
  alto: number;
};

/** Reduce un mapa promediando bloques de `factor` x `factor`. */
export function reducir(mapa: MapaGris, factor: number): MapaGris {
  const ancho = Math.max(1, Math.floor(mapa.ancho / factor));
  const alto = Math.max(1, Math.floor(mapa.alto / factor));
  const datos = new Uint8Array(ancho * alto);

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      let suma = 0;
      let cuenta = 0;
      for (let dy = 0; dy < factor; dy++) {
        const oy = y * factor + dy;
        if (oy >= mapa.alto) break;
        for (let dx = 0; dx < factor; dx++) {
          const ox = x * factor + dx;
          if (ox >= mapa.ancho) break;
          suma += mapa.datos[oy * mapa.ancho + ox];
          cuenta++;
        }
      }
      datos[y * ancho + x] = cuenta === 0 ? 0 : Math.round(suma / cuenta);
    }
  }

  return { datos, ancho, alto };
}
```

- [ ] **Paso 4: Correr el test y verificar que pasa**

```bash
cd app && npm test -- registro-imagen
```

Esperado: PASS, 3 tests.

- [ ] **Paso 5: Commit**

```bash
git add app/src/lib/landing/registro-imagen.ts app/src/__tests__/registro-imagen.test.ts
git commit -m "feat: reduccion de mapas de bytes para registro de recortes"
```

---

### Tarea 2: Módulo de registro — búsqueda de offset

**Archivos:**
- Modificar: `app/src/lib/landing/registro-imagen.ts`
- Modificar: `app/src/__tests__/registro-imagen.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

Añadir al final de `app/src/__tests__/registro-imagen.test.ts` (y ampliar el import de la primera línea a `import { calcularOffset, reducir, type MapaGris } from "@/lib/landing/registro-imagen";`):

```ts
function recortar(base: MapaGris, x0: number, y0: number, ancho: number, alto: number): MapaGris {
  const datos = new Uint8Array(ancho * alto);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      datos[y * ancho + x] = base.datos[(y0 + y) * base.ancho + (x0 + x)];
    }
  }
  return { datos, ancho, alto };
}

describe("calcularOffset", () => {
  it("encuentra la posición exacta de la que salió el recorte", () => {
    const base = mapa(40, 30, (x, y) => (x * 37 + y * 91) % 251);
    const trozo = recortar(base, 7, 5, 10, 8);
    const offset = calcularOffset(base, trozo);
    expect(offset.x).toBe(7);
    expect(offset.y).toBe(5);
    expect(offset.diferencia).toBe(0);
  });

  it("ignora los píxeles transparentes al comparar", () => {
    const base = mapa(20, 20, (x, y) => (x * 17 + y * 43) % 199);
    const trozo = recortar(base, 4, 6, 8, 8);
    // Se ensucia una esquina que la máscara marcará como transparente.
    trozo.datos[0] = 255;
    trozo.datos[1] = 255;
    const alfa: MapaGris = {
      ancho: 8,
      alto: 8,
      datos: new Uint8Array(64).fill(255),
    };
    alfa.datos[0] = 0;
    alfa.datos[1] = 0;

    const offset = calcularOffset(base, trozo, alfa);
    expect(offset.x).toBe(4);
    expect(offset.y).toBe(6);
    expect(offset.diferencia).toBe(0);
  });

  it("respeta la ventana de búsqueda", () => {
    const base = mapa(40, 30, (x, y) => (x * 37 + y * 91) % 251);
    const trozo = recortar(base, 20, 10, 6, 6);
    const offset = calcularOffset(base, trozo, null, {
      centro: { x: 20, y: 10 },
      ventana: 2,
    });
    expect(offset.x).toBe(20);
    expect(offset.y).toBe(10);
  });

  it("lanza error si el recorte no cabe en la base", () => {
    const base = mapa(10, 10, () => 0);
    const trozo = mapa(20, 20, () => 0);
    expect(() => calcularOffset(base, trozo)).toThrow(/no cabe/);
  });
});
```

- [ ] **Paso 2: Correr el test y verificar que falla**

```bash
cd app && npm test -- registro-imagen
```

Esperado: FAIL con `calcularOffset is not a function` o error de importación.

- [ ] **Paso 3: Escribir la implementación**

Añadir a `app/src/lib/landing/registro-imagen.ts`:

```ts
export type Offset = {
  x: number;
  y: number;
  /** Diferencia media por píxel comparado. 0 = coincidencia exacta. */
  diferencia: number;
};

export type OpcionesRegistro = {
  /** Compara 1 de cada `paso` píxeles. Sube la velocidad, baja la precisión. */
  paso?: number;
  centro?: { x: number; y: number };
  ventana?: number;
};

/**
 * Busca la posición de `recorte` dentro de `base` minimizando la diferencia
 * absoluta media. Si se entrega `alfa`, solo compara donde el recorte es opaco.
 */
export function calcularOffset(
  base: MapaGris,
  recorte: MapaGris,
  alfa: MapaGris | null = null,
  opciones: OpcionesRegistro = {},
): Offset {
  const maxX = base.ancho - recorte.ancho;
  const maxY = base.alto - recorte.alto;

  if (maxX < 0 || maxY < 0) {
    throw new Error(
      `El recorte (${recorte.ancho}x${recorte.alto}) no cabe en la base (${base.ancho}x${base.alto})`,
    );
  }

  const paso = Math.max(1, opciones.paso ?? 1);

  let desdeX = 0;
  let hastaX = maxX;
  let desdeY = 0;
  let hastaY = maxY;

  if (opciones.centro && opciones.ventana !== undefined) {
    desdeX = Math.max(0, opciones.centro.x - opciones.ventana);
    hastaX = Math.min(maxX, opciones.centro.x + opciones.ventana);
    desdeY = Math.max(0, opciones.centro.y - opciones.ventana);
    hastaY = Math.min(maxY, opciones.centro.y + opciones.ventana);
  }

  let mejor: Offset = { x: 0, y: 0, diferencia: Number.POSITIVE_INFINITY };

  for (let oy = desdeY; oy <= hastaY; oy++) {
    for (let ox = desdeX; ox <= hastaX; ox++) {
      let suma = 0;
      let cuenta = 0;

      for (let y = 0; y < recorte.alto; y += paso) {
        const filaRecorte = y * recorte.ancho;
        const filaBase = (oy + y) * base.ancho + ox;
        for (let x = 0; x < recorte.ancho; x += paso) {
          if (alfa && alfa.datos[filaRecorte + x] < 128) continue;
          suma += Math.abs(recorte.datos[filaRecorte + x] - base.datos[filaBase + x]);
          cuenta++;
        }
      }

      if (cuenta === 0) continue;
      const diferencia = suma / cuenta;
      if (diferencia < mejor.diferencia) {
        mejor = { x: ox, y: oy, diferencia };
      }
    }
  }

  return mejor;
}
```

- [ ] **Paso 4: Correr el test y verificar que pasa**

```bash
cd app && npm test -- registro-imagen
```

Esperado: PASS, 7 tests.

- [ ] **Paso 5: Commit**

```bash
git add app/src/lib/landing/registro-imagen.ts app/src/__tests__/registro-imagen.test.ts
git commit -m "feat: busqueda de offset por diferencia minima con mascara alfa"
```

---

### Tarea 3: Registro grueso-a-fino

**Archivos:**
- Modificar: `app/src/lib/landing/registro-imagen.ts`
- Modificar: `app/src/__tests__/registro-imagen.test.ts`

- [ ] **Paso 1: Escribir el test que falla**

Añadir al final de `app/src/__tests__/registro-imagen.test.ts` (y sumar `registrarRecorte` al import de la primera línea):

```ts
describe("registrarRecorte", () => {
  it("encuentra el offset en una imagen grande sin recorrerla entera a resolución completa", () => {
    // Rampa suave que sobrevive a la reducción, más una marca única de alto
    // contraste que hace la coincidencia inequívoca en ambas pasadas.
    const base = mapa(200, 160, (x, y) => (x * 7 + y * 13) % 200);
    for (let y = 60; y < 69; y++) {
      for (let x = 90; x < 99; x++) {
        base.datos[y * 200 + x] = 255;
      }
    }

    const trozo = recortar(base, 83, 57, 60, 40);
    const offset = registrarRecorte(base, trozo, null);

    expect(offset.x).toBe(83);
    expect(offset.y).toBe(57);
  });
});
```

- [ ] **Paso 2: Correr el test y verificar que falla**

```bash
cd app && npm test -- registro-imagen
```

Esperado: FAIL con `registrarRecorte is not a function`.

- [ ] **Paso 3: Escribir la implementación**

Añadir a `app/src/lib/landing/registro-imagen.ts`:

```ts
/**
 * Registro en dos pasadas: una búsqueda gruesa sobre versiones reducidas y un
 * refinamiento a resolución completa en una ventana alrededor del ganador.
 * Buscar directo a resolución completa sería inviable: para la ciudad real son
 * ~44.000 posiciones por ~850.000 píxeles cada una.
 */
export function registrarRecorte(
  base: MapaGris,
  recorte: MapaGris,
  alfa: MapaGris | null,
  factor = 8,
): Offset {
  const grueso = calcularOffset(
    reducir(base, factor),
    reducir(recorte, factor),
    alfa ? reducir(alfa, factor) : null,
  );

  return calcularOffset(base, recorte, alfa, {
    centro: { x: grueso.x * factor, y: grueso.y * factor },
    ventana: factor * 2,
    paso: 3,
  });
}
```

- [ ] **Paso 4: Correr el test y verificar que pasa**

```bash
cd app && npm test -- registro-imagen
```

Esperado: PASS, 8 tests.

- [ ] **Paso 5: Commit**

```bash
git add app/src/lib/landing/registro-imagen.ts app/src/__tests__/registro-imagen.test.ts
git commit -m "feat: registro grueso-a-fino de recortes de manzana"
```

---

### Tarea 4: Extracción de silueta desde el canal alfa

**Archivos:**
- Crear: `app/src/lib/landing/silueta-alfa.ts`
- Test: `app/src/__tests__/silueta-alfa.test.ts`

**Nota de diseño:** el contorno se construye recorriendo el borde izquierdo hacia abajo y el derecho hacia arriba, muestreando una de cada `pasoFilas` filas. Es suficiente para volúmenes arquitectónicos, que son macizos y sin agujeros, y mantiene el polígono en decenas de puntos en vez de miles. Fidelidad percibida, no exactitud geométrica.

- [ ] **Paso 1: Escribir el test que falla**

Crear `app/src/__tests__/silueta-alfa.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { contornoAPolygonCss, extraerContorno } from "@/lib/landing/silueta-alfa";
import type { MapaGris } from "@/lib/landing/registro-imagen";

function alfa(ancho: number, alto: number, opaco: (x: number, y: number) => boolean): MapaGris {
  const datos = new Uint8Array(ancho * alto);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      datos[y * ancho + x] = opaco(x, y) ? 255 : 0;
    }
  }
  return { datos, ancho, alto };
}

describe("extraerContorno", () => {
  it("rodea un rectángulo opaco", () => {
    const mapa = alfa(10, 10, (x, y) => x >= 2 && x <= 7 && y >= 3 && y <= 8);
    const puntos = extraerContorno(mapa, { pasoFilas: 1 });

    // 6 filas opacas x 2 lados
    expect(puntos).toHaveLength(12);
    expect(puntos[0]).toEqual({ x: 2, y: 3 });
    expect(puntos[5]).toEqual({ x: 2, y: 8 });
    expect(puntos[6]).toEqual({ x: 7, y: 8 });
    expect(puntos[11]).toEqual({ x: 7, y: 3 });
  });

  it("sigue un borde diagonal", () => {
    const mapa = alfa(10, 10, (x, y) => x >= y && x < 8);
    const puntos = extraerContorno(mapa, { pasoFilas: 1 });
    expect(puntos[0]).toEqual({ x: 0, y: 0 });
    expect(puntos[3]).toEqual({ x: 3, y: 3 });
  });

  it("submuestrea según pasoFilas", () => {
    const mapa = alfa(10, 12, (x, y) => x >= 1 && x <= 8);
    const puntos = extraerContorno(mapa, { pasoFilas: 4 });
    // filas 0, 4 y 8 por cada lado
    expect(puntos).toHaveLength(6);
  });

  it("devuelve vacío si no hay nada opaco", () => {
    const mapa = alfa(5, 5, () => false);
    expect(extraerContorno(mapa)).toEqual([]);
  });
});

describe("contornoAPolygonCss", () => {
  it("expresa los puntos como porcentajes del recorte", () => {
    const css = contornoAPolygonCss(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 20 },
      ],
      10,
      20,
    );
    expect(css).toBe("polygon(0.00% 0.00%, 100.00% 0.00%, 100.00% 100.00%)");
  });

  it("devuelve cadena vacía si no hay polígono posible", () => {
    expect(contornoAPolygonCss([{ x: 1, y: 1 }], 10, 10)).toBe("");
  });
});
```

- [ ] **Paso 2: Correr el test y verificar que falla**

```bash
cd app && npm test -- silueta-alfa
```

Esperado: FAIL con `Failed to resolve import "@/lib/landing/silueta-alfa"`.

- [ ] **Paso 3: Escribir la implementación**

Crear `app/src/lib/landing/silueta-alfa.ts`:

```ts
/**
 * Extrae la silueta clicable de una manzana desde su canal alfa.
 *
 * Se emite como `clip-path: polygon()` en porcentajes, no como `path()`:
 * `path()` usa unidades fijas en píxeles y no escala con el elemento, así que
 * las siluetas se romperían apenas la ciudad cambiara de tamaño.
 */

import type { MapaGris } from "./registro-imagen";

export type Punto = { x: number; y: number };

export type OpcionesContorno = {
  /** Valor mínimo de alfa para considerar un píxel parte de la manzana. */
  umbral?: number;
  /** Se muestrea una de cada N filas. Más alto = menos puntos, menos detalle. */
  pasoFilas?: number;
};

/**
 * Recorre el borde izquierdo hacia abajo y el derecho hacia arriba.
 * Válido para volúmenes macizos sin agujeros, que es el caso de las manzanas.
 */
export function extraerContorno(
  alfa: MapaGris,
  opciones: OpcionesContorno = {},
): Punto[] {
  const umbral = opciones.umbral ?? 128;
  const pasoFilas = Math.max(1, opciones.pasoFilas ?? 8);

  const izquierda: Punto[] = [];
  const derecha: Punto[] = [];

  for (let y = 0; y < alfa.alto; y += pasoFilas) {
    const fila = y * alfa.ancho;
    let minimo = -1;
    let maximo = -1;

    for (let x = 0; x < alfa.ancho; x++) {
      if (alfa.datos[fila + x] >= umbral) {
        if (minimo === -1) minimo = x;
        maximo = x;
      }
    }

    if (minimo === -1) continue;
    izquierda.push({ x: minimo, y });
    derecha.push({ x: maximo, y });
  }

  if (izquierda.length === 0) return [];
  return [...izquierda, ...derecha.reverse()];
}

/** Convierte el contorno a un valor de `clip-path` relativo al recorte. */
export function contornoAPolygonCss(
  puntos: Punto[],
  ancho: number,
  alto: number,
  decimales = 2,
): string {
  if (puntos.length < 3) return "";

  const partes = puntos.map((punto) => {
    const px = ((punto.x / ancho) * 100).toFixed(decimales);
    const py = ((punto.y / alto) * 100).toFixed(decimales);
    return `${px}% ${py}%`;
  });

  return `polygon(${partes.join(", ")})`;
}
```

- [ ] **Paso 4: Correr el test y verificar que pasa**

```bash
cd app && npm test -- silueta-alfa
```

Esperado: PASS, 6 tests.

- [ ] **Paso 5: Commit**

```bash
git add app/src/lib/landing/silueta-alfa.ts app/src/__tests__/silueta-alfa.test.ts
git commit -m "feat: extraccion de silueta clicable desde el canal alfa"
```

---

### Tarea 5: Script generador de datos-ciudad

**Archivos:**
- Crear: `app/scripts/landing/generar-datos-ciudad.ts`
- Modificar: `app/package.json` (sección `scripts`)

**Nota:** este script toca el sistema de archivos y tarda decenas de segundos. No lleva test unitario: su lógica ya está cubierta por las tareas 1-4. La verificación es la tarea 6.

- [ ] **Paso 1: Crear el script**

Crear `app/scripts/landing/generar-datos-ciudad.ts`:

```ts
/**
 * Calcula la posición real y la silueta clicable de cada manzana dentro de la
 * ciudad base, y emite src/components/landing-v2/datos-ciudad.ts.
 *
 * Uso:  npm run landing:datos-ciudad
 *
 * Los recortes de public/landing/districts/ fueron cortados de
 * ciudad-modular-limpia.png pero nadie registró de dónde. Este script lo
 * averigua comparando píxeles en vez de estimar porcentajes a ojo.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { registrarRecorte, type MapaGris } from "../../src/lib/landing/registro-imagen";
import { contornoAPolygonCss, extraerContorno } from "../../src/lib/landing/silueta-alfa";

const RAIZ = process.cwd();
const BASE = path.join(RAIZ, "public", "landing", "ciudad-modular-limpia.png");
const DIRECTORIO_RECORTES = path.join(RAIZ, "public", "landing", "districts");
const SALIDA = path.join(RAIZ, "src", "components", "landing-v2", "datos-ciudad.ts");

const MANZANAS = [
  { id: "consulta", numero: "01", titulo: "Consulta", detalle: "Centro de inteligencia normativa", href: "/chat", icono: "Search" },
  { id: "archivo", numero: "02", titulo: "Archivo", detalle: "Archivo normativo", href: "/archivo", icono: "FileText" },
  { id: "guias", numero: "03", titulo: "Guías", detalle: "Escuela de casos", href: "/guias", icono: "BookOpen" },
  { id: "metodo", numero: "04", titulo: "Cómo funciona", detalle: "Taller de metodología", href: "/como-funciona", icono: "Settings" },
  { id: "cuenta", numero: "05", titulo: "Mi cuenta", detalle: "Oficina personal", href: "/dashboard", icono: "UserRound" },
  { id: "contacto", numero: "06", titulo: "Contacto", detalle: "Centro de atención", href: "/contacto", icono: "MessageCircle" },
] as const;

async function leerGris(archivo: string): Promise<MapaGris> {
  const { data, info } = await sharp(archivo)
    .removeAlpha()
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { datos: new Uint8Array(data), ancho: info.width, alto: info.height };
}

async function leerAlfa(archivo: string): Promise<MapaGris | null> {
  const metadatos = await sharp(archivo).metadata();
  if (!metadatos.hasAlpha) return null;

  const { data, info } = await sharp(archivo)
    .extractChannel(3)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { datos: new Uint8Array(data), ancho: info.width, alto: info.height };
}

function porcentaje(valor: number, total: number): string {
  return `${((valor / total) * 100).toFixed(3)}%`;
}

async function main() {
  const base = await leerGris(BASE);
  console.log(`Base: ${base.ancho}x${base.alto}`);

  const filas: string[] = [];

  for (const manzana of MANZANAS) {
    const archivo = path.join(DIRECTORIO_RECORTES, `${manzana.id}.png`);
    const inicio = Date.now();

    const recorte = await leerGris(archivo);
    const alfa = await leerAlfa(archivo);

    const offset = registrarRecorte(base, recorte, alfa);

    const contorno = alfa ? extraerContorno(alfa, { pasoFilas: 12 }) : [];
    const silueta = contornoAPolygonCss(contorno, recorte.ancho, recorte.alto);

    const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
    console.log(
      `${manzana.id.padEnd(10)} ${recorte.ancho}x${recorte.alto}  ->  ` +
        `(${offset.x}, ${offset.y})  dif=${offset.diferencia.toFixed(2)}  ` +
        `pts=${contorno.length}  ${segundos}s`,
    );

    if (offset.diferencia > 12) {
      console.warn(`  AVISO: diferencia alta en ${manzana.id}. Revisa el registro antes de confiar en él.`);
    }
    if (silueta === "") {
      console.warn(`  AVISO: sin silueta para ${manzana.id}. Caerá a caja rectangular.`);
    }

    filas.push(
      [
        `  {`,
        `    id: "${manzana.id}",`,
        `    numero: "${manzana.numero}",`,
        `    titulo: "${manzana.titulo}",`,
        `    detalle: "${manzana.detalle}",`,
        `    href: "${manzana.href}",`,
        `    icono: "${manzana.icono}",`,
        `    poster: "/landing/districts/${manzana.id}.png",`,
        `    video: "/landing/district-videos/${manzana.id}.webm",`,
        `    caja: {`,
        `      left: "${porcentaje(offset.x, base.ancho)}",`,
        `      top: "${porcentaje(offset.y, base.alto)}",`,
        `      width: "${porcentaje(recorte.ancho, base.ancho)}",`,
        `      height: "${porcentaje(recorte.alto, base.alto)}",`,
        `    },`,
        `    silueta: ${silueta === "" ? "null" : `"${silueta}"`},`,
        `  },`,
      ].join("\n"),
    );
  }

  const contenido = `/**
 * GENERADO AUTOMÁTICAMENTE — no editar a mano.
 * Regenerar con:  npm run landing:datos-ciudad
 *
 * Las cajas son porcentajes sobre ciudad-modular-limpia.png (${base.ancho}x${base.alto}).
 * La silueta es un clip-path relativo a la caja de cada manzana.
 */

export type Manzana = {
  id: string;
  numero: string;
  titulo: string;
  detalle: string;
  href: string;
  icono: string;
  poster: string;
  video: string;
  caja: { left: string; top: string; width: string; height: string };
  /** null si la extracción falló: la manzana cae a su caja rectangular. */
  silueta: string | null;
};

export const CIUDAD_ANCHO = ${base.ancho};
export const CIUDAD_ALTO = ${base.alto};

export const MANZANAS: Manzana[] = [
${filas.join("\n")}
];
`;

  await mkdir(path.dirname(SALIDA), { recursive: true });
  await writeFile(SALIDA, contenido, "utf8");
  console.log(`\nEscrito: ${path.relative(RAIZ, SALIDA)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Paso 2: Registrar el comando en package.json**

En `app/package.json`, dentro de `"scripts"`, añadir tras la línea de `"eval:prod"`:

```json
    "landing:datos-ciudad": "tsx scripts/landing/generar-datos-ciudad.ts",
```

- [ ] **Paso 3: Verificar que el script compila y arranca**

```bash
cd app && npx tsc --noEmit -p tsconfig.json
```

Esperado: sin errores nuevos referidos a `generar-datos-ciudad.ts`, `registro-imagen.ts` ni `silueta-alfa.ts`.

- [ ] **Paso 4: Commit**

```bash
git add app/scripts/landing/generar-datos-ciudad.ts app/package.json
git commit -m "feat: script que calcula offsets y siluetas reales de las manzanas"
```

---

### Tarea 6: Ejecutar sobre las imágenes reales y verificar

**Archivos:**
- Crear: `app/src/components/landing-v2/datos-ciudad.ts` (lo genera el script)

- [ ] **Paso 1: Ejecutar el generador**

```bash
cd app && npm run landing:datos-ciudad
```

Esperado: una línea por manzana con su offset, la diferencia y el número de puntos del contorno, más `Escrito: src/components/landing-v2/datos-ciudad.ts`.

Criterios de aceptación de la salida:
- Las seis manzanas reportan `dif` menor a 12. Un valor alto significa que el recorte no salió de esta base o que fue editado después.
- Ninguna reporta `pts=0`.
- Los offsets están dentro del lienzo: `x + ancho ≤ 1672` y `y + alto ≤ 941`.

Si alguna manzana da diferencia alta, no sigas: anótalo y repórtalo. Es información real sobre los activos, no un fallo del script.

- [ ] **Paso 2: Comprobar que el archivo generado es TypeScript válido**

```bash
cd app && npx tsc --noEmit -p tsconfig.json
```

Esperado: sin errores.

- [ ] **Paso 3: Verificar el registro visualmente**

Este paso confirma que los números significan lo que creemos. Crear un archivo temporal `app/scripts/landing/verificar-registro.ts`:

```ts
/**
 * Compone cada recorte sobre la base en el offset calculado y escribe un PNG
 * de control. Si el registro es correcto, la manzana debe ser indistinguible
 * del fondo: no debe verse contorno, doble borde ni desplazamiento.
 */

import path from "node:path";
import sharp from "sharp";
import { MANZANAS, CIUDAD_ANCHO, CIUDAD_ALTO } from "../../src/components/landing-v2/datos-ciudad";

const RAIZ = process.cwd();
const BASE = path.join(RAIZ, "public", "landing", "ciudad-modular-limpia.png");
const SALIDA = path.join(RAIZ, "tmp", "verificacion-registro.png");

function aPixeles(porcentaje: string, total: number): number {
  return Math.round((parseFloat(porcentaje) / 100) * total);
}

async function main() {
  const capas = MANZANAS.map((manzana) => ({
    input: path.join(RAIZ, "public", "landing", "districts", `${manzana.id}.png`),
    left: aPixeles(manzana.caja.left, CIUDAD_ANCHO),
    top: aPixeles(manzana.caja.top, CIUDAD_ALTO),
  }));

  await sharp(BASE).composite(capas).toFile(SALIDA);
  console.log(`Escrito: ${path.relative(RAIZ, SALIDA)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Ejecutar:

```bash
cd app && mkdir -p tmp && npx tsx scripts/landing/verificar-registro.ts
```

Abrir `app/tmp/verificacion-registro.png` y compararlo con `app/public/landing/ciudad-modular-limpia.png`. Deben verse idénticos. Cualquier manzana con halo, borde doble o desplazamiento indica un registro incorrecto.

- [ ] **Paso 4: Borrar el script de verificación**

Cumplió su función y no debe quedar en el repo.

```bash
cd app && rm scripts/landing/verificar-registro.ts && rm -rf tmp/verificacion-registro.png
```

- [ ] **Paso 5: Commit**

```bash
git add app/src/components/landing-v2/datos-ciudad.ts
git commit -m "feat: datos de ciudad con offsets y siluetas calculados"
```

---

## Definición de terminado

- [ ] `npm test` pasa completo, sin regresiones en los siete archivos de test preexistentes.
- [ ] `npm run landing:datos-ciudad` es reproducible: correrlo dos veces produce el mismo archivo.
- [ ] `src/components/landing-v2/datos-ciudad.ts` existe, compila, y contiene las seis manzanas con caja y silueta.
- [ ] La composición de verificación es indistinguible de la ciudad base.
- [ ] Ningún porcentaje estimado a ojo sobrevive en el archivo generado.

## Qué desbloquea

Con `datos-ciudad.ts` en su sitio, el video piloto puede posicionarse exactamente sobre su manzana y comprobarse si calza. Ese es el objetivo de este plan.

## Fuera de alcance

- La landing en sí, la secuencia de scroll y las secciones de contenido: son el plan 2.
- El header global, el dock y el footer: son el plan 3.
- Las siluetas nocturnas y el segundo set de videos: fase 2 del spec.
