import { getInputProps, useCurrentFrame } from "remotion";

// Desfase del obturador (0 a 1 cuadro). Para el motion blur, el script de render
// dibuja el video varias veces con desfases distintos y después promedia las pasadas.
const entrada = getInputProps() as { obturador?: number };
export const OBTURADOR =
  typeof entrada.obturador === "number" ? entrada.obturador : 0;

// Cuadro actual (con decimales) dentro de la secuencia.
export const useT = () => useCurrentFrame() + OBTURADOR;

// Speed ramp: claves [cuadro, velocidad]. Devuelve el "tiempo de la acción" en cuadros,
// integrando la velocidad. Velocidad 1 = tiempo real, 0.25 = cámara lenta, 2 = acelerado.
export type Rampa = readonly (readonly [number, number])[];

export const rampa = (t: number, claves: Rampa): number => {
  const [f0, v0] = claves[0];
  if (t <= f0) {
    return (t - f0) * v0;
  }
  let acumulado = 0;
  for (let i = 0; i < claves.length - 1; i++) {
    const [a, va] = claves[i];
    const [b, vb] = claves[i + 1];
    if (t <= b) {
      const vt = va + ((vb - va) * (t - a)) / (b - a);
      return acumulado + ((va + vt) / 2) * (t - a);
    }
    acumulado += ((va + vb) / 2) * (b - a);
  }
  const [fu, vu] = claves[claves.length - 1];
  return acumulado + (t - fu) * vu;
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const mezclar = (a: number, b: number, k: number) => a + (b - a) * k;
export const suave = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};
export const salidaExpo = (x: number) => {
  const k = clamp01(x);
  return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
};
export const entradaCubica = (x: number) => {
  const k = clamp01(x);
  return k * k * k;
};
export const salidaCubica = (x: number) => {
  const k = clamp01(x);
  return 1 - Math.pow(1 - k, 3);
};
// Rango normalizado: 0 antes de a, 1 después de b.
export const tramo = (t: number, a: number, b: number) =>
  b <= a ? (t >= a ? 1 : 0) : clamp01((t - a) / (b - a));
