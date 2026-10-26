import React from "react";
import { AbsoluteFill, random } from "remotion";
import { COLORES, FUENTE_DEPORTE, FUENTE_TITULO } from "../marca";
import { clamp01, salidaExpo, tramo } from "../tiempo";

// Destello blanco (o de color) a pantalla completa.
export const Flash: React.FC<{ readonly fuerza: number; readonly color?: string }> = ({ fuerza, color = "#ffffff" }) =>
  fuerza > 0.001 ? (
    <AbsoluteFill style={{ backgroundColor: color, opacity: clamp01(fuerza), mixBlendMode: "screen" }} />
  ) : null;

// Viñeta para concentrar la mirada en el centro.
export const Vineta: React.FC<{ readonly fuerza?: number }> = ({ fuerza = 0.55 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(2,6,20,${fuerza}) 100%)`,
    }}
  />
);

// Copos grandes y desenfocados en primer plano (la capa más cercana a la cámara).
export const NieveFrente: React.FC<{
  readonly t: number;
  readonly cantidad?: number;
  readonly velocidad?: [number, number];
  readonly tam?: number;
  readonly opacidad?: number;
  readonly semilla?: string;
  readonly color?: string;
}> = ({ t, cantidad = 26, velocidad = [-2, 6], tam = 1, opacidad = 0.8, semilla = "frente", color = "255,255,255" }) => (
  <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
    {new Array(cantidad).fill(0).map((_, i) => {
      const r = (s: string) => random(`${semilla}${s}${i}`);
      const z = 0.3 + r("z") * 0.7;
      const d = (14 + r("d") * 50) * tam * z;
      const x = ((r("x") * 2200 + t * velocidad[0] * z * (0.7 + r("v") * 0.6)) % 2200 + 2200) % 2200 - 140;
      const y = ((r("y") * 1300 + t * velocidad[1] * z * (0.7 + r("w") * 0.6)) % 1300 + 1300) % 1300 - 110;
      const desenfoque = (1 - z) * 6 + d * 0.08;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x + Math.sin(t * 0.05 + r("f") * 6) * 30,
            top: y,
            width: d,
            height: d,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(${color},${0.95 * opacidad}) 0%, rgba(${color},${0.35 * opacidad}) 45%, rgba(${color},0) 70%)`,
            filter: `blur(${desenfoque}px)`,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

// Destello de lente sobre una fuente de luz (sol, faroles): halo, raya anamórfica y "fantasmas".
export const Destello: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly fuerza: number;
  readonly color?: string;
}> = ({ x, y, fuerza, color = "255,214,120" }) => {
  if (fuerza <= 0.001) return null;
  const cx = 960;
  const cy = 540;
  const fantasmas = [0.35, 0.62, 0.9, 1.25, 1.6];
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: x - 500,
          top: y - 500,
          width: 1000,
          height: 1000,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(${color},${0.75 * fuerza}) 0%, rgba(${color},${0.25 * fuerza}) 18%, rgba(${color},0) 55%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - 1300,
          top: y - 7,
          width: 2600,
          height: 14,
          background: `linear-gradient(90deg, rgba(120,170,255,0) 0%, rgba(150,190,255,${0.7 * fuerza}) 50%, rgba(120,170,255,0) 100%)`,
          filter: "blur(3px)",
        }}
      />
      {fantasmas.map((k, i) => {
        const gx = x + (cx - x) * k * 2;
        const gy = y + (cy - y) * k * 2;
        const tam = 40 + i * 38;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: gx - tam / 2,
              top: gy - tam / 2,
              width: tam,
              height: tam,
              borderRadius: "50%",
              border: `2px solid rgba(${i % 2 ? "140,200,255" : color},${0.18 * fuerza})`,
              background: `radial-gradient(circle, rgba(${i % 2 ? "140,200,255" : color},${0.1 * fuerza}) 0%, rgba(0,0,0,0) 70%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Título grande que entra con impacto: zoom desde atrás, desenfoque, separación de color y temblor.
export const TituloImpacto: React.FC<{
  readonly lineas: readonly string[];
  readonly t: number; // cuadros desde el golpe (negativo = todavía no)
  readonly tam?: number;
  readonly y?: number;
  readonly color?: string;
  readonly acento?: string;
  readonly salida?: number; // cuadros desde que empieza a irse
}> = ({ lineas, t, tam = 170, y = 540, color = "#ffffff", acento = COLORES.rojo, salida = -1 }) => {
  if (t < -2) return null;
  const k = salidaExpo(tramo(t, -2, 7));
  const escala = 2.6 - 1.65 * k + (t > 7 ? 0.05 * Math.min(1, (t - 7) / 40) : -0.05 * (1 - tramo(t, 7, 11)));
  const desenfoque = (1 - k) * 22;
  const separacion = Math.max(0, 14 * (1 - tramo(t, 5, 16)));
  const sacudida = Math.max(0, 1 - tramo(t, 5, 18)) * 10;
  const sx = (random(`sx${Math.floor(t)}`) - 0.5) * sacudida;
  const sy = (random(`sy${Math.floor(t)}`) - 0.5) * sacudida;
  const ida = salida >= 0 ? salidaExpo(tramo(salida, 0, 8)) : 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: y,
          left: 0,
          right: 0,
          translate: `${sx}px ${sy - 50}% `,
          scale: String(escala * (1 + ida * 0.6)),
          opacity: clamp01(k * 1.4) * (1 - ida),
          filter: `blur(${desenfoque + ida * 18}px)`,
          textAlign: "center",
        }}
      >
        {lineas.map((l, i) => (
          <div
            key={l}
            style={{
              fontFamily: FUENTE_TITULO,
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: i === 0 ? tam : tam * 0.82,
              lineHeight: 0.95,
              letterSpacing: "-0.01em",
              color,
              textShadow: `${separacion}px 0 0 rgba(226,27,77,0.85), ${-separacion}px 0 0 rgba(60,200,255,0.75), 0 8px 40px rgba(0,0,0,0.45)`,
              WebkitTextStroke: i === 1 ? `0px` : undefined,
            }}
          >
            {i === 1 ? <span style={{ color: acento === COLORES.rojo ? color : acento }}>{l}</span> : l}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Rótulo de evento: barra de color que barre y revela el nombre + lugar.
export const Rotulo: React.FC<{
  readonly nombre: string;
  readonly lugar: string;
  readonly t: number;
  readonly x?: number;
  readonly y?: number;
  readonly tam?: number;
  readonly salida?: number;
}> = ({ nombre, lugar, t, x = 110, y = 790, tam = 120, salida = -1 }) => {
  if (t < 0) return null;
  const barra = salidaExpo(tramo(t, 0, 8));
  const texto = salidaExpo(tramo(t, 3, 12));
  const sub = salidaExpo(tramo(t, 7, 16));
  const ida = salida >= 0 ? salidaExpo(tramo(salida, 0, 7)) : 0;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: x, top: y, opacity: 1 - ida, translate: `${-ida * 120}px 0px` }}>
        <div
          style={{
            position: "absolute",
            left: -26,
            top: 6,
            width: 12,
            height: tam * 0.92 * barra,
            background: COLORES.rojo,
          }}
        />
        <div
          style={{
            fontFamily: FUENTE_DEPORTE,
            fontWeight: 800,
            fontStyle: "italic",
            fontSize: tam,
            lineHeight: 0.95,
            color: "#ffffff",
            letterSpacing: "0.01em",
            clipPath: `inset(0 ${100 - texto * 100}% 0 0)`,
            textShadow: "0 6px 30px rgba(0,0,0,0.45)",
            whiteSpace: "nowrap",
          }}
        >
          {nombre}
        </div>
        <div
          style={{
            marginTop: 10,
            display: "inline-block",
            background: COLORES.amarillo,
            color: COLORES.azulProfundo,
            fontFamily: FUENTE_DEPORTE,
            fontWeight: 800,
            fontSize: tam * 0.42,
            padding: "4px 16px 2px",
            letterSpacing: "0.08em",
            clipPath: `inset(0 ${100 - sub * 100}% 0 0)`,
          }}
        >
          {lugar}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Rayas de velocidad radiales (para las aceleraciones).
export const RayasVelocidad: React.FC<{ readonly fuerza: number; readonly t: number }> = ({ fuerza, t }) => {
  if (fuerza <= 0.01) return null;
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none" }}>
      <svg width={1920} height={1080}>
        {new Array(70).fill(0).map((_, i) => {
          const a = random(`ra${i}`) * Math.PI * 2;
          const r0 = 420 + ((random(`rr${i}`) * 900 + t * 90) % 900);
          const largo = 120 + random(`rl${i}`) * 260;
          return (
            <line
              key={i}
              x1={960 + Math.cos(a) * r0}
              y1={540 + Math.sin(a) * r0 * 0.6}
              x2={960 + Math.cos(a) * (r0 + largo)}
              y2={540 + Math.sin(a) * (r0 + largo) * 0.6}
              stroke={`rgba(255,255,255,${0.35 * fuerza})`}
              strokeWidth={1.5 + random(`rw${i}`) * 2.5}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// Nieve que "golpea la lente": copos que salen de un punto hacia los bordes, creciendo y desenfocándose.
export const ExplosionNieve: React.FC<{
  readonly t: number; // cuadros desde el impacto
  readonly x: number;
  readonly y: number;
  readonly cantidad?: number;
  readonly semilla?: string;
}> = ({ t, x, y, cantidad = 60, semilla = "lente" }) => {
  if (t < 0) return null;
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      {new Array(cantidad).fill(0).map((_, i) => {
        const r = (s: string) => random(`${semilla}${s}${i}`);
        const a = r("a") * Math.PI * 2;
        const v = 60 + r("v") * 160;
        const retraso = r("d") * 4;
        const tt = Math.max(0, t - retraso);
        if (tt <= 0) return null;
        const dist = v * tt * (1 + tt * 0.12);
        const tam = (12 + r("t") * 40) * (1 + tt * 0.35);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + Math.cos(a) * dist - tam / 2,
              top: y + Math.sin(a) * dist * 0.75 - tam / 2,
              width: tam,
              height: tam,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(240,246,255,0.6) 45%, rgba(255,255,255,0) 72%)",
              filter: `blur(${tt * 0.9}px)`,
              opacity: Math.min(1, tt / 2),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
