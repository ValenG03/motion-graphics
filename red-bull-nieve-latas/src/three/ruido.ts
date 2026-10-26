// Ruido de gradiente 2D determinístico: da la forma natural a montañas, pistas y escarcha.

const fract = (x: number) => x - Math.floor(x);
const hash = (x: number, y: number) =>
  fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);

const gradiente = (ix: number, iy: number, x: number, y: number) => {
  const a = hash(ix, iy) * Math.PI * 2;
  return Math.cos(a) * (x - ix) + Math.sin(a) * (y - iy);
};

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export const ruido2 = (x: number, y: number) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const sx = fade(x - x0);
  const sy = fade(y - y0);
  const n00 = gradiente(x0, y0, x, y);
  const n10 = gradiente(x0 + 1, y0, x, y);
  const n01 = gradiente(x0, y0 + 1, x, y);
  const n11 = gradiente(x0 + 1, y0 + 1, x, y);
  const a = n00 + (n10 - n00) * sx;
  const b = n01 + (n11 - n01) * sx;
  return (a + (b - a) * sy) * 1.4;
};

export const fbm = (x: number, y: number, octavas = 5) => {
  let suma = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octavas; i++) {
    suma += amp * ruido2(x * f + i * 17.3, y * f - i * 9.1);
    f *= 2.03;
    amp *= 0.5;
  }
  return suma;
};

// Crestas filosas, como aristas de montaña.
export const crestas = (x: number, y: number, octavas = 6) => {
  let suma = 0;
  let amp = 0.5;
  let f = 1;
  let peso = 1;
  for (let i = 0; i < octavas; i++) {
    let n = 1 - Math.abs(ruido2(x * f + i * 31.7, y * f + i * 5.3));
    n *= n;
    n *= peso;
    peso = Math.min(1, Math.max(0, n * 1.6));
    suma += n * amp;
    f *= 2.1;
    amp *= 0.5;
  }
  return suma;
};
