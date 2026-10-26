// Logo estilizado (dos toros que embisten delante de un sol), dibujado a mano con puntos
// que se suavizan con curvas Catmull-Rom. Se usa en SVG (pantalla) y en Canvas (latas).

type P = readonly [number, number];

// Toro mirando a la derecha, en una caja de ~200 x 120.
const PUNTOS_TORO: P[] = [
  [2, 5],
  [9, 11],
  [17, 21],
  [25, 32],
  [34, 38],
  [48, 36],
  [66, 31],
  [84, 24],
  [100, 14],
  [115, 10],
  [129, 15],
  [141, 26],
  [149, 36],
  [163, 31],
  [178, 27],
  [194, 25],
  [181, 34],
  [167, 42],
  [159, 49],
  [166, 61],
  [171, 73],
  [169, 82],
  [158, 85],
  [147, 81],
  [139, 84],
  [134, 89],
  [149, 97],
  [163, 104],
  [171, 110],
  [164, 115],
  [149, 112],
  [134, 105],
  [128, 106],
  [126, 115],
  [117, 116],
  [116, 104],
  [104, 97],
  [86, 97],
  [72, 97],
  [61, 99],
  [47, 105],
  [31, 111],
  [15, 115],
  [5, 116],
  [6, 110],
  [19, 104],
  [34, 96],
  [44, 86],
  [40, 72],
  [36, 56],
  [31, 45],
  [25, 39],
  [17, 28],
  [9, 16],
  [3, 10],
];

const catmullRomCerrado = (pts: P[], tension = 0.5): string => {
  const n = pts.length;
  const p = (i: number) => pts[(i + n) % n];
  let d = `M ${p(0)[0]} ${p(0)[1]} `;
  for (let i = 0; i < n; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    const k = tension / 3;
    const c1x = p1[0] + (p2[0] - p0[0]) * k;
    const c1y = p1[1] + (p2[1] - p0[1]) * k;
    const c2x = p2[0] - (p3[0] - p1[0]) * k;
    const c2y = p2[1] - (p3[1] - p1[1]) * k;
    d += `C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0]} ${p2[1]} `;
  }
  return d + "Z";
};

export const PATH_TORO = catmullRomCerrado(PUNTOS_TORO, 0.55);

// Caja del emblema completo (sol + toros), sin el logotipo de texto.
export const EMBLEMA = { ancho: 400, alto: 190 };
export const SOL = { x: 200, y: 84, r: 68 };
// Cada toro se ubica con traslación + escala; el derecho se espeja.
export const TORO_IZQ = { x: 16, y: 62, escala: 0.98 };
export const TORO_DER = { x: 384, y: 62, escala: 0.98 };

// Dibuja el emblema en un canvas 2D (para las texturas de las latas).
export const dibujarEmblema = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  ancho: number,
  colorToro: string,
  colorSol: string,
) => {
  const s = ancho / EMBLEMA.ancho;
  ctx.save();
  ctx.translate(cx - (EMBLEMA.ancho * s) / 2, cy - (EMBLEMA.alto * s) / 2);
  ctx.scale(s, s);
  ctx.fillStyle = colorSol;
  ctx.beginPath();
  ctx.arc(SOL.x, SOL.y, SOL.r, 0, Math.PI * 2);
  ctx.fill();
  const toro = new Path2D(PATH_TORO);
  ctx.fillStyle = colorToro;
  ctx.save();
  ctx.translate(TORO_IZQ.x, TORO_IZQ.y);
  ctx.scale(TORO_IZQ.escala, TORO_IZQ.escala);
  ctx.fill(toro);
  ctx.restore();
  ctx.save();
  ctx.translate(TORO_DER.x, TORO_DER.y);
  ctx.scale(-TORO_DER.escala, TORO_DER.escala);
  ctx.fill(toro);
  ctx.restore();
  ctx.restore();
};
