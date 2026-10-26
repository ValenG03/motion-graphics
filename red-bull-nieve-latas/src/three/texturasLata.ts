import { random } from "remotion";
import { FUENTE_DEPORTE, FUENTE_TITULO, LATAS, VarianteLata } from "../marca";
import { dibujarEmblema } from "../logo";
import { COLORES } from "../marca";
import { fbm } from "./ruido";

// La etiqueta envuelve el cilindro: 2 "caras" iguales (frente y dorso).
export const ANCHO_ETIQUETA = 2048;
export const ALTO_ETIQUETA = 1408;
const CARA = ANCHO_ETIQUETA / 2;
const CUADRO = CARA / 8;

const nuevoCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

// Columna donde cambia el damero de color al plateado, en escalera.
const frontera = (fila: number) => (fila < 4 ? 3 : fila < 8 ? 4 : 5);

const cacheEtiquetas = new Map<VarianteLata, HTMLCanvasElement>();
const cacheMR = new Map<VarianteLata, HTMLCanvasElement>();

export const etiquetaLata = (v: VarianteLata): HTMLCanvasElement => {
  const guardada = cacheEtiquetas.get(v);
  if (guardada) return guardada;
  const d = LATAS[v];
  const c = nuevoCanvas(ANCHO_ETIQUETA, ALTO_ETIQUETA);
  const ctx = c.getContext("2d")!;
  const filas = Math.ceil(ALTO_ETIQUETA / CUADRO);

  for (let cara = 0; cara < 2; cara++) {
    const x0 = cara * CARA;
    for (let fila = 0; fila < filas; fila++) {
      for (let col = 0; col < 8; col++) {
        const enColor = col < frontera(fila);
        const par = (fila + col) % 2 === 0;
        ctx.fillStyle = enColor
          ? par
            ? d.tono1
            : d.tono2
          : par
            ? d.tono3
            : d.tono4;
        ctx.fillRect(x0 + col * CUADRO, fila * CUADRO, CUADRO + 1, CUADRO + 1);
      }
    }

    const cx = x0 + CARA / 2;
    // Panel claro detrás del logo para que se lea sobre los dos colores.
    const panel = ctx.createRadialGradient(cx, 560, 30, cx, 560, 420);
    panel.addColorStop(0, "rgba(236,238,243,0.82)");
    panel.addColorStop(0.55, "rgba(226,229,236,0.55)");
    panel.addColorStop(1, "rgba(226,229,236,0)");
    ctx.fillStyle = panel;
    ctx.beginPath();
    ctx.ellipse(cx, 560, 420, 380, 0, 0, Math.PI * 2);
    ctx.fill();

    dibujarEmblema(ctx, cx, 470, 660, COLORES.rojo, COLORES.amarillo);

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `900 200px "${FUENTE_TITULO}"`;
    ctx.lineJoin = "round";
    ctx.lineWidth = 14;
    ctx.strokeStyle = "#ffffff";
    ctx.strokeText("Red Bull", cx, 790);
    ctx.fillStyle = COLORES.rojo;
    ctx.fillText("Red Bull", cx, 790);

    // Franja con el nombre del producto.
    ctx.fillStyle = "rgba(244,245,248,0.95)";
    ctx.fillRect(x0 + 90, 850, CARA - 180, 130);
    ctx.fillStyle = v === "clasica" || v === "sugarfree" || v === "zero" ? d.texto : d.tono2;
    ctx.font = `800 ${d.nombre.length > 14 ? 92 : 112}px "${FUENTE_DEPORTE}"`;
    ctx.fillText(d.nombre, cx, 950);

    if (d.linea2) {
      ctx.font = `800 italic 84px "${FUENTE_DEPORTE}"`;
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.strokeText(d.linea2, cx, 1110);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(d.linea2, cx, 1110);
    }

    ctx.font = `600 54px "${FUENTE_DEPORTE}"`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("250 ml", cx, 1320);
  }

  // Brillo vertical suave (la tinta sobre aluminio refleja más arriba).
  const brillo = ctx.createLinearGradient(0, 0, 0, ALTO_ETIQUETA);
  brillo.addColorStop(0, "rgba(255,255,255,0.10)");
  brillo.addColorStop(0.5, "rgba(255,255,255,0)");
  brillo.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 0, ANCHO_ETIQUETA, ALTO_ETIQUETA);

  cacheEtiquetas.set(v, c);
  return c;
};

// Mapa de metal/rugosidad: el plateado es metal puro, la tinta de color un poco menos.
export const metalRugosidadLata = (v: VarianteLata): HTMLCanvasElement => {
  const guardada = cacheMR.get(v);
  if (guardada) return guardada;
  const c = nuevoCanvas(512, 352);
  const ctx = c.getContext("2d")!;
  const k = 512 / ANCHO_ETIQUETA;
  const filas = Math.ceil(ALTO_ETIQUETA / CUADRO);
  for (let cara = 0; cara < 2; cara++) {
    for (let fila = 0; fila < filas; fila++) {
      for (let col = 0; col < 8; col++) {
        const enColor = col < frontera(fila);
        // G = rugosidad, B = metal.
        ctx.fillStyle = enColor ? "rgb(0,70,150)" : "rgb(0,45,255)";
        ctx.fillRect(
          (cara * CARA + col * CUADRO) * k,
          fila * CUADRO * k,
          CUADRO * k + 1,
          CUADRO * k + 1,
        );
      }
    }
    ctx.fillStyle = "rgb(0,80,120)";
    ctx.beginPath();
    ctx.ellipse((cara * CARA + CARA / 2) * k, 560 * k, 470 * k, 420 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  cacheMR.set(v, c);
  return c;
};

let cacheGotas: HTMLCanvasElement | null = null;
// Gotas de condensación: blanco = gota (se usa como color y como transparencia).
export const gotasCondensacion = (): HTMLCanvasElement => {
  if (cacheGotas) return cacheGotas;
  const c = nuevoCanvas(1024, 704);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 1400; i++) {
    const x = random(`gx${i}`) * c.width;
    const y = random(`gy${i}`) * c.height;
    const grande = random(`gg${i}`) > 0.93;
    const r = grande ? 5 + random(`gr${i}`) * 7 : 1 + random(`gr${i}`) * 3;
    const alto = grande ? r * (1.2 + random(`ga${i}`) * 0.6) : r;
    const g = ctx.createRadialGradient(x - r * 0.3, y - alto * 0.35, 0, x, y, Math.max(r, alto));
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(220,230,240,0.75)");
    g.addColorStop(0.85, "rgba(150,160,170,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r, alto, 0, 0, Math.PI * 2);
    ctx.fill();
    // Algunas gotas grandes chorrean hacia abajo.
    if (grande && random(`gc${i}`) > 0.6) {
      const largo = 20 + random(`gl${i}`) * 60;
      const linea = ctx.createLinearGradient(x, y, x, y + largo);
      linea.addColorStop(0, "rgba(220,230,240,0.6)");
      linea.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = linea;
      ctx.fillRect(x - r * 0.35, y, r * 0.7, largo);
    }
  }
  cacheGotas = c;
  return c;
};

let cacheEscarcha: { color: HTMLCanvasElement; crecimiento: HTMLCanvasElement } | null = null;
// Escarcha: cristales blancos con ruido. El mapa de "crecimiento" (gris) marca cuándo aparece
// cada zona: abajo primero, para que el hielo suba por la lata con bordes irregulares.
export const escarcha = () => {
  if (cacheEscarcha) return cacheEscarcha;
  const w = 512;
  const h = 352;
  const color = nuevoCanvas(w, h);
  const crec = nuevoCanvas(w, h);
  const ctxC = color.getContext("2d")!;
  const ctxG = crec.getContext("2d")!;
  const imgC = ctxC.createImageData(w, h);
  const imgG = ctxG.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      // Se repite sin costura alrededor del cilindro.
      const ang = u * Math.PI * 2;
      const nx = Math.cos(ang) * 2.2;
      const nz = Math.sin(ang) * 2.2;
      const n = fbm(nx + v * 3.1, nz + v * 6.3, 5);
      const fino = fbm(nx * 6 + 11, nz * 6 + v * 30, 3);
      const valor = Math.min(1, Math.max(0, 0.62 + n * 0.9 + fino * 0.5));
      // v = 0 arriba en el canvas; la lata se llena desde abajo (v = 1).
      const momento = Math.min(1, Math.max(0, (1 - v) * 0.8 + 0.1 + n * 0.22));
      const g = 0.22 + 0.78 * (1 - momento) * (0.7 + 0.3 * valor);
      const i = (y * w + x) * 4;
      imgC.data[i] = Math.round(222 + valor * 33);
      imgC.data[i + 1] = Math.round(236 + valor * 19);
      imgC.data[i + 2] = 255;
      imgC.data[i + 3] = 255;
      const gg = Math.round(Math.min(1, g) * 255);
      imgG.data[i] = gg;
      imgG.data[i + 1] = gg;
      imgG.data[i + 2] = gg;
      imgG.data[i + 3] = 255;
    }
  }
  ctxC.putImageData(imgC, 0, 0);
  ctxG.putImageData(imgG, 0, 0);
  cacheEscarcha = { color, crecimiento: crec };
  return cacheEscarcha;
};

let cacheGrietas: HTMLCanvasElement | null = null;
// Grietas del hielo: líneas quebradas que salen de varios puntos de impacto.
export const grietas = (): HTMLCanvasElement => {
  if (cacheGrietas) return cacheGrietas;
  const c = nuevoCanvas(1024, 704);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const rama = (x: number, y: number, ang: number, largo: number, grosor: number, semilla: string, nivel: number) => {
    let px = x;
    let py = y;
    let a = ang;
    ctx.beginPath();
    ctx.moveTo(px, py);
    const pasos = Math.max(3, Math.round(largo / 18));
    for (let i = 0; i < pasos; i++) {
      a += (random(`${semilla}a${i}`) - 0.5) * 0.9;
      px += Math.cos(a) * (largo / pasos);
      py += Math.sin(a) * (largo / pasos);
      ctx.lineTo(px, py);
      if (nivel < 2 && random(`${semilla}b${i}`) > 0.72) {
        ctx.stroke();
        rama(px, py, a + (random(`${semilla}c${i}`) > 0.5 ? 0.8 : -0.8), largo * 0.5, grosor * 0.6, `${semilla}-${i}`, nivel + 1);
        ctx.beginPath();
        ctx.moveTo(px, py);
      }
    }
    ctx.lineWidth = grosor;
    ctx.stroke();
  };
  ctx.strokeStyle = "#fff";
  ctx.shadowColor = "#bfe6ff";
  ctx.shadowBlur = 8;
  const impactos = [
    [260, 330],
    [760, 300],
    [520, 520],
  ];
  impactos.forEach(([x, y], k) => {
    for (let r = 0; r < 9; r++) {
      rama(x, y, (r / 9) * Math.PI * 2 + random(`i${k}${r}`) * 0.5, 160 + random(`l${k}${r}`) * 220, 4, `g${k}-${r}`, 0);
    }
  });
  cacheGrietas = c;
  return c;
};
