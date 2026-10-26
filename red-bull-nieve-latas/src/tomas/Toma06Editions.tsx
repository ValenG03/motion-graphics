import React from "react";
import { AbsoluteFill } from "remotion";
import { FUENTE_DEPORTE, FUENTE_TITULO, LATAS, VarianteLata } from "../marca";
import { V3 } from "../three/Atleta";
import { Camara, proyectar, temblor } from "../three/Camara";
import { Entorno } from "../three/Entorno";
import { Escena3D } from "../three/Escena3D";
import { ALTO_LATA, Lata } from "../three/Lata";
import { Estallido, NieveCayendo } from "../three/Particulas";
import { clamp01, mezclar, salidaExpo, suave, tramo, useT } from "../tiempo";
import { Flash, Vineta } from "../ui/Efectos";

// TOMA 6 (10–12 s) · LATAS · Editions
// Abanico de Red, Green y Pomelo: cada una explota en partículas de su color, al ritmo.

type Edicion = { v: VarianteLata; golpe: number; c1: string; c2: string; sabor: string; rgb: string };
const EDICIONES: Edicion[] = [
  { v: "red", golpe: 15, c1: "#ff1f3a", c2: "#ff9aa6", sabor: "SANDÍA", rgb: "255,40,70" },
  { v: "green", golpe: 30, c1: "#33ff55", c2: "#c4ffb0", sabor: "FRUTA DEL DRAGÓN", rgb: "60,255,90" },
  { v: "pomelo", golpe: 45, c1: "#ff6f96", c2: "#ffd3df", sabor: "POMELO · SUGARFREE", rgb: "255,120,160" },
];

const posLata = (i: number, abre: number): { pos: V3; rot: V3 } => {
  const k = i - 1;
  return {
    pos: [k * 1.75 * abre, -Math.abs(k) * 0.28 * abre, -Math.abs(k) * 0.55 * abre],
    rot: [0, -k * 0.32 * abre, -k * 0.2 * abre],
  };
};

export const Toma06Editions: React.FC = () => {
  const t = useT();
  // Se abren en abanico con un pequeño rebote.
  const abre = (i: number) => {
    const x = clamp01((t - 2 - Math.abs(i - 1) * 2) / 11);
    return 1 - Math.pow(1 - x, 3) * Math.cos(x * 6) ;
  };
  const sacudon = EDICIONES.reduce((acc, e) => acc + Math.max(0, 1 - Math.abs(t - e.golpe - 2) / 6) * (t >= e.golpe ? 1 : 0), 0);
  const tb = temblor(t * 4, 0.05 * sacudon);
  const plano = {
    pos: [mezclar(0.8, -0.6, suave(tramo(t, 0, 60))) + tb[0], mezclar(0.6, 0.9, suave(tramo(t, 0, 60))) + tb[1], mezclar(9.8, 8.6, suave(tramo(t, 0, 60)))] as V3,
    mirar: [0, -0.35, 0] as V3,
    fov: 34,
    giro: mezclar(0.05, -0.04, suave(tramo(t, 0, 60))),
  };
  // Color de fondo que se tiñe con cada explosión.
  const tinte = EDICIONES.map((e) => ({ e, k: t >= e.golpe ? Math.exp(-(t - e.golpe) / 7) : 0 }));

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, #18204a 0%, #070b1c 55%, #010205 100%)" }}>
      {tinte.map(({ e, k }) =>
        k > 0.01 ? (
          <AbsoluteFill
            key={e.v}
            style={{ background: `radial-gradient(circle at 50% 50%, rgba(${e.rgb},${0.65 * k}) 0%, rgba(${e.rgb},${0.18 * k}) 40%, rgba(0,0,0,0) 75%)` }}
          />
        ) : null,
      )}
      <Escena3D filtro="contrast(1.1) saturate(1.25)">
        <Camara {...plano} />
        <Entorno tipo="estudio" intensidad={1.15} />
        <ambientLight intensity={0.12} />
        <directionalLight position={[2, 5, 6]} intensity={1.4} />
        {EDICIONES.map((e, i) => {
          const { pos, rot } = posLata(i, abre(i));
          const dt = t - e.golpe;
          // Al explotar: golpe de escala y medio giro rápido.
          const pulso = dt >= 0 ? Math.exp(-dt / 5) * 0.18 : 0;
          const giro = dt >= 0 ? (1 - Math.exp(-dt / 6)) * Math.PI * 2 : 0;
          return (
            <group key={e.v}>
              <pointLight position={[pos[0], pos[1] + 0.5, pos[2] + 2.2]} intensity={dt >= 0 ? 30 * Math.exp(-dt / 10) : 0} distance={8} color={e.c1} />
              <group position={pos} rotation={[rot[0], rot[1] + giro + 0.1, rot[2]]} scale={1 + pulso}>
                <Lata variante={e.v} condensacion={0.6} brillo={1.1} />
              </group>
              <Estallido cantidad={3600} origen={[pos[0], pos[1], pos[2]]} edad={dt / 30} apertura={1} velocidad={9} gravedad={1.2} arrastre={1.5} vida={1.8} tam={2.6} aditivo color={e.c1} color2={e.c2} semilla={`ed-${e.v}`} />
              <Estallido cantidad={500} origen={[pos[0], pos[1], pos[2]]} edad={dt / 30} apertura={1} velocidad={11} gravedad={2} arrastre={1} vida={1.1} tam={0.8} aditivo color="#ffffff" color2={e.c2} semilla={`edb-${e.v}`} />
              {e.v === "red" ? (
                <Estallido cantidad={160} origen={[pos[0], pos[1], pos[2]]} edad={dt / 30} apertura={1} velocidad={5} gravedad={3} arrastre={1.2} vida={1.6} tam={0.9} color="#141414" semilla="semillas" />
              ) : null}
            </group>
          );
        })}
        <NieveCayendo cantidad={500} centro={[0, 0, -3]} caja={[16, 10, 8]} tiempo={t} caida={0.025} viento={[0.01, 0]} tam={0.5} opacidad={0.5} />
      </Escena3D>
      {/* Onda expansiva 2D y nombre de cada edición */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {EDICIONES.map((e, i) => {
          const dt = t - e.golpe;
          const { pos } = posLata(i, abre(i));
          const centro = proyectar(plano, [pos[0], pos[1], pos[2]], 1920, 1080);
          const base = proyectar(plano, [pos[0], pos[1] - ALTO_LATA / 2 - 0.35, pos[2]], 1920, 1080);
          const r = dt >= 0 ? salidaExpo(dt / 14) * 900 : 0;
          const etiqueta = salidaExpo(tramo(dt, 1, 9));
          return (
            <React.Fragment key={e.v}>
              {dt >= 0 && dt < 16 ? (
                <div
                  style={{
                    position: "absolute",
                    left: centro.x - r,
                    top: centro.y - r,
                    width: r * 2,
                    height: r * 2,
                    borderRadius: "50%",
                    border: `${Math.max(1, 14 * (1 - dt / 16))}px solid rgba(${e.rgb},${0.8 * (1 - dt / 16)})`,
                    boxShadow: `0 0 60px rgba(${e.rgb},${0.6 * (1 - dt / 16)})`,
                  }}
                />
              ) : null}
              <div
                style={{
                  position: "absolute",
                  left: base.x - 260,
                  width: 520,
                  top: base.y + 10,
                  textAlign: "center",
                  opacity: etiqueta,
                  translate: `0px ${(1 - etiqueta) * 30}px`,
                }}
              >
                <div style={{ fontFamily: FUENTE_DEPORTE, fontWeight: 800, fontStyle: "italic", fontSize: 50, color: "#ffffff", letterSpacing: "0.03em", textShadow: `0 0 24px rgba(${e.rgb},0.9)` }}>
                  {LATAS[e.v].nombre.replace("THE ", "")}
                </div>
                <div style={{ fontFamily: FUENTE_DEPORTE, fontWeight: 600, fontSize: 32, color: `rgb(${e.rgb})`, letterSpacing: "0.12em", marginTop: 2 }}>{e.sabor}</div>
              </div>
            </React.Fragment>
          );
        })}
        <div
          style={{
            position: "absolute",
            top: 70,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: FUENTE_TITULO,
            fontWeight: 900,
            fontStyle: "italic",
            fontSize: 92,
            color: "#ffffff",
            opacity: salidaExpo(tramo(t, 48, 55)),
            scale: String(mezclar(1.3, 1, salidaExpo(tramo(t, 48, 55)))),
            filter: `blur(${(1 - salidaExpo(tramo(t, 48, 55))) * 12}px)`,
            textShadow: "0 8px 40px rgba(0,0,0,0.6)",
          }}
        >
          AAALAS PARA TODOS LOS GUSTOS
        </div>
      </AbsoluteFill>
      <Vineta fuerza={0.55} />
      {EDICIONES.map((e) => (
        <Flash key={e.v} fuerza={t >= e.golpe ? 0.45 * Math.exp(-(t - e.golpe) / 2.5) : 0} color={e.c1} />
      ))}
      <Flash fuerza={Math.max(0.45 * (1 - tramo(t, 0, 4)), tramo(t, 57, 60) * 0.5)} />
    </AbsoluteFill>
  );
};
