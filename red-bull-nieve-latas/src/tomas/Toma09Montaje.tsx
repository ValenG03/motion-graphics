import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { FUENTE_TITULO } from "../marca";
import { mezclar, salidaExpo, tramo, useT } from "../tiempo";
import { Flash, RayasVelocidad, Vineta } from "../ui/Efectos";
import { Toma03InfiniteLines } from "./Toma03InfiniteLines";
import { Toma05HeavyMetal } from "./Toma05HeavyMetal";
import { Toma07NaturalSelection } from "./Toma07NaturalSelection";

// TOMA 9 (16–18 s) · NIEVE · Montaje rápido de los 3 eventos
// Cortes cada vez más cortos al compás (8 → 4 cuadros), con flashes y el nombre de cada evento.

type Evento = "hm" | "il" | "ns";
const CORTES: { desde: number; dura: number; evento: Evento; cuadroFuente: number }[] = [
  { desde: 0, dura: 8, evento: "hm", cuadroFuente: 30 },
  { desde: 8, dura: 7, evento: "il", cuadroFuente: 22 },
  { desde: 15, dura: 8, evento: "ns", cuadroFuente: 40 },
  { desde: 23, dura: 7, evento: "hm", cuadroFuente: 44 },
  { desde: 30, dura: 7, evento: "il", cuadroFuente: 44 },
  { desde: 37, dura: 7, evento: "ns", cuadroFuente: 50 },
  { desde: 44, dura: 4, evento: "hm", cuadroFuente: 20 },
  { desde: 48, dura: 4, evento: "il", cuadroFuente: 32 },
  { desde: 52, dura: 4, evento: "ns", cuadroFuente: 28 },
  { desde: 56, dura: 4, evento: "hm", cuadroFuente: 52 },
];

const NOMBRE: Record<Evento, string> = { hm: "HEAVY METAL", il: "INFINITE LINES", ns: "NATURAL SELECTION" };

const Fuente: React.FC<{ readonly evento: Evento }> = ({ evento }) =>
  evento === "hm" ? <Toma05HeavyMetal sinTextos /> : evento === "il" ? <Toma03InfiniteLines sinTextos /> : <Toma07NaturalSelection sinTextos />;

// Zoom de golpe al entrar cada corte.
const Golpe: React.FC<{ readonly children: React.ReactNode }> = ({ children }) => {
  const t = useT();
  return <AbsoluteFill style={{ scale: String(mezclar(1.12, 1, salidaExpo(tramo(t, 0, 5)))) }}>{children}</AbsoluteFill>;
};

const NombreGigante: React.FC<{ readonly texto: string; readonly lado: number }> = ({ texto, lado }) => {
  const t = useT();
  const k = salidaExpo(tramo(t, 0, 4));
  const sep = 16 * (1 - tramo(t, 0, 6));
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: lado < 0 ? "flex-start" : "flex-end", padding: "0 110px", pointerEvents: "none" }}>
      <div
        style={{
          fontFamily: FUENTE_TITULO,
          fontWeight: 900,
          fontStyle: "italic",
          fontSize: 190,
          lineHeight: 0.9,
          color: "rgba(255,255,255,0.95)",
          textAlign: lado < 0 ? "left" : "right",
          scale: String(mezclar(1.6, 1, k)),
          opacity: k,
          textShadow: `${sep}px 0 0 rgba(226,27,77,0.9), ${-sep}px 0 0 rgba(60,200,255,0.8), 0 10px 50px rgba(0,0,0,0.5)`,
          maxWidth: 1400,
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};

export const Toma09Montaje: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {CORTES.map((c, i) => (
        <Sequence key={i} name={`Corte ${i + 1} · ${NOMBRE[c.evento]}`} from={c.desde} durationInFrames={c.dura} premountFor={3}>
          <Golpe>
            {/* El Sequence interno con "from" negativo adelanta la toma original hasta el cuadro elegido */}
            <Sequence from={-c.cuadroFuente} layout="absolute-fill">
              <Fuente evento={c.evento} />
            </Sequence>
          </Golpe>
          {c.dura >= 7 ? <NombreGigante texto={NOMBRE[c.evento]} lado={i % 2 === 0 ? -1 : 1} /> : null}
        </Sequence>
      ))}
      {/* Destello de un cuadro en cada corte */}
      {CORTES.map((c, i) => (
        <Sequence key={`f${i}`} from={c.desde} durationInFrames={2} layout="absolute-fill">
          <Flash fuerza={0.55} />
        </Sequence>
      ))}
      <RayasVelocidad fuerza={0.35 + 0.5 * tramo(t, 40, 60)} t={t} />
      <Vineta fuerza={0.5} />
      {/* El riser termina en blanco: entrada al cierre */}
      <Flash fuerza={Math.pow(tramo(t, 50, 60), 2)} />
    </AbsoluteFill>
  );
};
