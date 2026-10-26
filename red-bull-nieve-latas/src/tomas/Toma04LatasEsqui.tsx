import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { COLORES, FUENTE_DEPORTE, FUENTE_TITULO, VarianteLata } from "../marca";
import { V3 } from "../three/Atleta";
import { Camara, proyectar, temblor } from "../three/Camara";
import { Cielo, SolRedBull } from "../three/Cielo";
import { Entorno } from "../three/Entorno";
import { Escena3D } from "../three/Escena3D";
import { Hielo, Huella } from "../three/Hielo";
import { ALTO_LATA, Lata } from "../three/Lata";
import { Estallido, NieveCayendo } from "../three/Particulas";
import { crestas } from "../three/ruido";
import { Terreno } from "../three/Terreno";
import { clamp01, mezclar, rampa, Rampa, salidaExpo, suave, tramo, useT } from "../tiempo";
import { Destello, Flash, NieveFrente, Vineta } from "../ui/Efectos";

// TOMA 4 (6–8 s) · LATAS
// La Sugarfree y la Zero entran deslizándose como esquís sobre un lago congelado:
// hacen curvas en S, se inclinan, tallan huellas y frenan de costado ("hockey stop").

const RAMPA: Rampa = [
  [0, 1.5],
  [30, 1.3],
  [38, 0.5],
  [50, 0.35],
  [60, 0.6],
];

// Las latas usan la escala de lata (1 unidad = 5 cm): el lago es enorme a su lado.
const DURACION = 40; // cuadros de acción hasta frenar
type Recorrido = { lado: number; fase: number; variante: VarianteLata };
const LATAS: Recorrido[] = [
  { lado: -1.5, fase: 0, variante: "sugarfree" },
  { lado: 1.5, fase: Math.PI, variante: "zero" },
];

const posEnRecorrido = (r: Recorrido, s: number) => {
  // s: 0 (lejos) → 1 (frenada frente a cámara)
  const z = mezclar(-46, 0, s);
  const amplitud = 3.2 * (1 - s) * (1 - s);
  const x = r.lado + amplitud * Math.sin(s * Math.PI * 3.4 + r.fase);
  return { x, z };
};

const avance = (ta: number) => salidaExpo(clamp01(ta / DURACION)) * 0.82 + clamp01(ta / DURACION) * 0.18;

const Montanas: React.FC = () => {
  const altura = useMemo(
    () => (x: number, z: number) => {
      const r = Math.sqrt(x * x + z * z);
      return THREE.MathUtils.smoothstep(r, 900, 1700) * crestas(x * 0.0016 + 1.2, z * 0.0016 - 0.4, 4) * 420 - 2;
    },
    [],
  );
  return <Terreno ancho={4400} largo={4400} segX={220} segZ={220} altura={altura} umbralRoca={0.5} colorNieve="#e7eefb" colorSombra="#aebfdc" colorRoca="#3a4152" />;
};

const SOL_POS: V3 = [-700, 230, -2000];

export const Toma04LatasEsqui: React.FC = () => {
  const t = useT();
  const ta = rampa(t, RAMPA);
  const s = avance(ta);
  const frenando = tramo(ta, 30, 42);

  const recorridos = useMemo(
    () => LATAS.map((r) => new Array(160).fill(0).map((_, i) => {
      const p = posEnRecorrido(r, i / 159);
      return [p.x, p.z] as [number, number];
    })),
    [],
  );

  const plano = {
    pos: [mezclar(1.6, 0.4, suave(tramo(ta, 0, 44))) + temblor(t, 0.02)[0], mezclar(1.0, 0.75, suave(tramo(ta, 0, 44))), mezclar(9.5, 8.2, suave(tramo(ta, 0, 44)))] as V3,
    mirar: [0, 1.1, mezclar(-14, -0.4, suave(tramo(ta, 4, 38)))] as V3,
    fov: mezclar(30, 36, suave(tramo(ta, 20, 50))),
    giro: mezclar(-0.06, 0, suave(tramo(ta, 0, 40))),
  };
  const sol = proyectar(plano, SOL_POS, 1920, 1080);
  const textos = salidaExpo(tramo(t, 40, 48));
  const arriba = LATAS.map((r) => {
    const p = posEnRecorrido(r, 1);
    return proyectar(plano, [p.x, ALTO_LATA + 0.2, p.z], 1920, 1080);
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#1b2350" }}>
      <Escena3D filtro="contrast(1.1) saturate(1.2)">
        <Camara {...plano} />
        <Entorno tipo="atardecer" intensidad={0.9} />
        <fog attach="fog" args={["#6a5f9a", 700, 3600]} />
        <Cielo arriba="#101a5a" horizonte="#ff9a5c" abajo="#2a2f66" solDir={[SOL_POS[0], SOL_POS[1], SOL_POS[2]]} solColor="#ffc27a" halo={0.9} />
        <SolRedBull posicion={SOL_POS} tam={110} />
        <hemisphereLight args={["#6f7fd8", "#20264a", 0.5]} />
        <directionalLight position={[-3, 2, -8]} intensity={2.4} color="#ffb06a" />
        <directionalLight position={[4, 6, 8]} intensity={0.9} color="#9fb6ff" />
        <Montanas />
        <Hielo tam={600} />
        {LATAS.map((r, i) => {
          const p = posEnRecorrido(r, s);
          const p2 = posEnRecorrido(r, Math.min(1, s + 0.01));
          const p0 = posEnRecorrido(r, Math.max(0, s - 0.01));
          // Inclinación hacia adentro de la curva (como un esquiador que carvea).
          const curva = (p2.x - 2 * p.x + p0.x) / 0.0001;
          const ladeo = THREE.MathUtils.clamp(-curva * 0.012, -0.42, 0.42) * (1 - frenando);
          // Frenada: se cruza de costado y se inclina hacia atrás un instante.
          const derrape = Math.sin(frenando * Math.PI) * 0.3 * (r.lado > 0 ? 1 : -1);
          const giroY = mezclar(-1.2 * r.lado, 0.12 * -r.lado, suave(tramo(ta, 26, 40)));
          return (
            <group key={r.variante}>
              <Huella puntos={recorridos[i]} progreso={s} ancho={0.11} />
              <group position={[p.x, ALTO_LATA / 2, p.z]} rotation={[derrape * 0.5, giroY, ladeo + derrape]}>
                <Lata variante={r.variante} condensacion={0.7} escarcha={0.3} brillo={1.1} />
              </group>
              {/* Virutas de hielo en cada curva y en la frenada */}
              <Estallido
                cantidad={600}
                origen={[p.x, 0.15, p.z]}
                edad={(ta - 6) / 30}
                direccion={[-r.lado, 0.8, 0.6]}
                apertura={0.6}
                velocidad={1.6}
                gravedad={3}
                vida={0.7}
                tam={0.8}
                emision={1.2}
                color="#e8f4ff"
                semilla={`viruta${i}`}
              />
              <Estallido
                cantidad={900}
                origen={[posEnRecorrido(r, 0.985).x, 0.15, posEnRecorrido(r, 0.985).z]}
                edad={(ta - 31) / 30}
                direccion={[r.lado * 1.2, 0.9, 0.5]}
                apertura={0.45}
                velocidad={4.5}
                gravedad={5}
                arrastre={1.4}
                vida={1.3}
                tam={1.3}
                color="#f2f9ff"
                semilla={`freno${i}`}
              />
            </group>
          );
        })}
        <NieveCayendo cantidad={600} centro={[0, 4, -6]} caja={[20, 9, 24]} tiempo={ta} caida={0.03} viento={[0.02, 0.01]} tam={0.35} opacidad={0.7} />
      </Escena3D>
      <Destello x={sol.x} y={sol.y} fuerza={sol.delante ? 0.6 : 0} color="255,180,110" />
      <NieveFrente t={ta} cantidad={12} velocidad={[-4, 3]} opacidad={0.4} semilla="t4" />
      <Vineta fuerza={0.45} />
      {/* Nombres sobre cada lata */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {[
          { texto: "SUGARFREE", color: "#7cc4f2" },
          { texto: "ZERO", color: "#ffffff" },
        ].map((n, i) => (
          <div
            key={n.texto}
            style={{
              position: "absolute",
              left: arriba[i].x - 400,
              width: 800,
              top: arriba[i].y - 150 - (1 - textos) * 40,
              textAlign: "center",
              fontFamily: FUENTE_DEPORTE,
              fontWeight: 800,
              fontStyle: "italic",
              fontSize: 128,
              color: n.color,
              opacity: textos,
              letterSpacing: "0.02em",
              textShadow: "0 8px 40px rgba(0,0,0,0.5)",
              filter: `blur(${(1 - textos) * 10}px)`,
              translate: `${(1 - textos) * (i === 0 ? -60 : 60)}px 0px`,
            }}
          >
            {n.texto}
          </div>
        ))}
        <div
          style={{
            position: "absolute",
            bottom: 90,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: FUENTE_TITULO,
            fontWeight: 900,
            fontStyle: "italic",
            fontSize: 64,
            color: COLORES.amarillo,
            opacity: salidaExpo(tramo(t, 46, 54)),
            letterSpacing: "0.04em",
            textShadow: "0 6px 30px rgba(0,0,0,0.5)",
          }}
        >
          SIN AZÚCAR. CON AAALAS.
        </div>
      </AbsoluteFill>
      <Flash fuerza={Math.max(0.45 * (1 - tramo(t, 0, 4)), tramo(t, 57, 60) * 0.5)} />
    </AbsoluteFill>
  );
};
