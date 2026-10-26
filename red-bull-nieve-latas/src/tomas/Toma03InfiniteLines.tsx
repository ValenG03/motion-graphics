import React from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { COLORES } from "../marca";
import { Atleta, Pose, POSES, poseEn, V3 } from "../three/Atleta";
import { Camara, PlanoCamara, proyectar, temblor } from "../three/Camara";
import { Cielo, SolRedBull } from "../three/Cielo";
import { Entorno } from "../three/Entorno";
import { Escena3D } from "../three/Escena3D";
import { alturaKicker, Kicker } from "../three/Kicker";
import { Estallido, NieveCayendo } from "../three/Particulas";
import { crestas, fbm } from "../three/ruido";
import { Terreno } from "../three/Terreno";
import { mezclar, rampa, Rampa, suave, tramo, useT } from "../tiempo";
import { Destello, Flash, NieveFrente, RayasVelocidad, Rotulo, Vineta } from "../ui/Efectos";

// TOMA 3 (4–6 s) · NIEVE · Red Bull Infinite Lines (Avoriaz)
// Esquiador freestyle hace un mortal hacia atrás; la cámara lo rodea en cámara lenta.

const RAMPA: Rampa = [
  [0, 2],
  [10, 1.8],
  [18, 0.45],
  [36, 0.45],
  [46, 2.2],
  [60, 2.4],
];

const VX = 12;
const VY = 5;
const LARGO_K = 8;
const ALTO_K = 2.4;
const POP = 10 / 30;

const softplus = (x: number, k: number) => Math.log(1 + Math.exp(x * k)) / k;
const alturaCon = (x: number, z: number, octavas: number) => {
  // Pista que baja hasta el kicker, "mesa" plana para aterrizar y después vuelve a caer.
  const base = -0.22 * x + 0.17 * softplus(x, 0.8) - 0.45 * softplus(x - 24, 0.5) - 0.18 * softplus(-(x + 80), 0.08);
  const r = Math.sqrt(x * x + z * z);
  // Combe du Fornet: un anfiteatro de picos alrededor.
  const montes = THREE.MathUtils.smoothstep(r, 150, 520) * crestas(x * 0.0035 - 2.3, z * 0.0035 + 5.1, octavas) * 360;
  const valle = 10 * (1 - Math.exp(-(z * z) / 1000));
  const lomas = fbm(x * 0.025 - 3.3, z * 0.03, 4) * 2.4 * THREE.MathUtils.smoothstep(Math.abs(z), 5, 18);
  return base + valle + lomas + fbm(x * 0.05, z * 0.05, 3) * 0.35 + montes;
};
const altura = (x: number, z: number) => alturaCon(x, z, 6);
const alturaLejos = (x: number, z: number) => {
  const dentro =
    (1 - THREE.MathUtils.smoothstep(Math.abs(x - 10), 70, 76)) * (1 - THREE.MathUtils.smoothstep(Math.abs(z), 30, 36));
  return alturaCon(x, z, 4) - dentro * 1.2;
};
const suelo = (x: number) => altura(x, 0);
const Y_LABIO = suelo(0) + ALTO_K;

const T_ATERRIZA = (() => {
  for (let s = 0.2; s < 4; s += 0.002) {
    if (Y_LABIO + VY * s - 4.9 * s * s <= suelo(VX * s) + 0.05) return s;
  }
  return 1.6;
})();
const X_ATERRIZA = VX * T_ATERRIZA;
const T_APICE = VY / 9.8;
const APICE: V3 = [VX * T_APICE, Y_LABIO + (VY * VY) / 19.6, 0];

const estado = (ta: number) => {
  const s = ta - POP;
  if (s < 0) {
    const x = VX * s;
    const y = suelo(x) + alturaKicker(x, LARGO_K, ALTO_K);
    const y2 = suelo(x + 0.05) + alturaKicker(x + 0.05, LARGO_K, ALTO_K);
    return { x, y, pendiente: Math.atan((y2 - y) / 0.05), mortal: 0 };
  }
  if (s < T_ATERRIZA) {
    const x = VX * s;
    const y = Y_LABIO + VY * s - 4.9 * s * s;
    // El mortal completo ocurre en el aire, con el giro más lento cerca del ápice (cuerpo recogido).
    const k = s / T_ATERRIZA;
    const mortal = -Math.PI * 2 * suave(Math.min(1, k * 1.08));
    return { x, y, pendiente: 0.25 * (1 - k) - 0.2 * k, mortal };
  }
  const x = X_ATERRIZA + VX * 0.9 * (s - T_ATERRIZA);
  const y = suelo(x);
  return { x, y, pendiente: Math.atan((suelo(x + 0.05) - y) / 0.05), mortal: -Math.PI * 2 };
};

const posesClave = (): (readonly [number, Pose])[] => {
  const p = POP * 30;
  const l = (POP + T_ATERRIZA) * 30;
  return [
    [p - 8, POSES.esquiBajada],
    [p - 2, POSES.esquiTuck],
    [p + 2, POSES.esquiPop],
    [p + 9, POSES.esquiTuck],
    [l - 12, POSES.esquiTuck],
    [l - 5, POSES.esquiAbierto],
    [l + 1, POSES.esquiBajada],
  ];
};

const SOL_DIR = new THREE.Vector3(0.55, 0.42, 0.72).normalize();
const SOL_POS: V3 = [APICE[0] + SOL_DIR.x * 900, APICE[1] + SOL_DIR.y * 900, SOL_DIR.z * 900];

const planoEn = (t: number, r: V3): PlanoCamara => {
  // Órbita alrededor del ápice durante la cámara lenta ("bullet time").
  const k = suave(tramo(t, 4, 50));
  const ang = mezclar(Math.PI * 0.62, -Math.PI * 0.18, k);
  const radio = mezclar(10, 7.4, suave(tramo(t, 0, 24)));
  const elev = mezclar(-0.3, -0.1, k);
  const centro: V3 = [mezclar(r[0], APICE[0], 0.6), mezclar(r[1], APICE[1], 0.5), 0];
  const pos: V3 = [
    centro[0] + Math.cos(ang) * radio * Math.cos(elev),
    centro[1] + Math.sin(elev) * radio + 0.4,
    Math.sin(ang) * radio * Math.cos(elev),
  ];
  // Que la cámara nunca quede bajo la nieve.
  pos[1] = Math.max(pos[1], altura(pos[0], pos[2]) + 0.8);
  const sac = t > 46 ? temblor(t * 3, 0.07) : [0, 0, 0];
  return {
    pos,
    mirar: [r[0] + sac[0], r[1] + 0.8 + sac[1], r[2]],
    fov: mezclar(42, 34, suave(tramo(t, 0, 20))),
    giro: mezclar(0.18, -0.12, k),
  };
};

// "sinTextos": para reutilizar la toma dentro del montaje rápido (toma 9).
export const Toma03InfiniteLines: React.FC<{ readonly sinTextos?: boolean }> = ({ sinTextos = false }) => {
  const t = useT();
  const ta = rampa(t, RAMPA) / 30;
  const r = estado(ta);
  const pose = poseEn(posesClave(), ta * 30);
  const plano = planoEn(t, [r.x, r.y, 0]);
  const sol = proyectar(plano, SOL_POS, 1920, 1080);
  const tAterriza = (() => {
    for (let f = 0; f <= 60; f += 0.25) if (rampa(f, RAMPA) / 30 >= POP + T_ATERRIZA) return f;
    return 99;
  })();

  return (
    <AbsoluteFill style={{ backgroundColor: "#2d64c8" }}>
      <Escena3D filtro="contrast(1.1) saturate(1.18)">
        <Camara {...plano} />
        <Entorno tipo="nieve" intensidad={0.45} />
        <fog attach="fog" args={["#bcd6f6", 240, 2600]} />
        <Cielo arriba="#0838a6" horizonte="#9ccaf6" abajo="#dfe9f6" solDir={[SOL_DIR.x, SOL_DIR.y, SOL_DIR.z]} solColor="#fff6c8" halo={0.45} />
        <SolRedBull posicion={SOL_POS} tam={120} />
        <hemisphereLight args={["#bcd4ff", "#8d9cbc", 0.6]} />
        <directionalLight position={[SOL_DIR.x * 10, SOL_DIR.y * 10, SOL_DIR.z * 10]} intensity={2.7} color="#ffe9c8" />
        <directionalLight position={[-10, 4, -6]} intensity={0.35} color="#cfe0ff" />
        <Terreno ancho={160} largo={70} segX={320} segZ={140} centro={[10, 0]} altura={altura} umbralRoca={0.6} colorNieve="#eef3fb" colorSombra="#c4d4ee" grano={0.06} />
        <Terreno ancho={1400} largo={1400} segX={240} segZ={240} altura={alturaLejos} umbralRoca={0.45} colorNieve="#eef3fb" colorSombra="#c4d4ee" colorRoca="#4c5260" />
        <Kicker largo={LARGO_K} alto={ALTO_K} ancho={6} suelo={suelo} />
        {/* Esquiador: avanza hacia +x; el mortal gira alrededor del centro del cuerpo */}
        <group position={[r.x, r.y, 0]} rotation={[0, Math.PI / 2, 0]}>
          <group rotation={[-r.pendiente, 0, 0]}>
            <group position={[0, 0.85, 0]} rotation={[r.mortal, 0, 0]}>
              <group position={[0, -0.85, 0]}>
                <Atleta tipo="esqui" pose={pose} colorCampera={COLORES.rojo} bastonIzq={[-0.1, -0.6, -1]} bastonDer={[0.1, -0.6, -1]} />
              </group>
            </group>
          </group>
        </group>
        <Estallido cantidad={500} origen={[0.2, Y_LABIO - 0.1, 0]} edad={ta - POP + 0.03} direccion={[1, 0.8, 0]} apertura={0.4} velocidad={5} gravedad={4} vida={1.4} tam={1.5} semilla="pop3" />
        <Estallido cantidad={1800} origen={[X_ATERRIZA, suelo(X_ATERRIZA) + 0.2, 0]} edad={ta - POP - T_ATERRIZA} direccion={[0.6, 1, 0.4]} apertura={0.55} velocidad={9} gravedad={4} arrastre={1} vida={1.8} tam={4} semilla="aterriza3" />
        <NieveCayendo cantidad={700} centro={[APICE[0], APICE[1], 0]} caja={[30, 16, 24]} tiempo={ta * 30} caida={0.02} viento={[0.03, 0.01]} tam={0.6} opacidad={0.8} />
      </Escena3D>
      <Destello x={sol.x} y={sol.y} fuerza={sol.delante ? 0.55 : 0} />
      <NieveFrente t={ta * 30} cantidad={16} velocidad={[-7, 4]} opacidad={0.55} semilla="t3" />
      <RayasVelocidad fuerza={0.5 * Math.max(1 - tramo(t, 2, 10), tramo(t, 48, 54))} t={t} />
      <Vineta fuerza={0.35} />
      {sinTextos ? null : <Rotulo nombre="RED BULL INFINITE LINES" lugar="AVORIAZ · FRANCIA" t={t - 12} x={110} y={90} tam={112} salida={t - 50} />}
      {sinTextos ? null : <Flash fuerza={Math.max(0.8 * (1 - tramo(t, 0, 6)), tAterriza < 60 ? 0.35 * (1 - tramo(t, tAterriza, tAterriza + 5)) * (t >= tAterriza ? 1 : 0) : 0, tramo(t, 57, 60) * 0.5)} />}
    </AbsoluteFill>
  );
};
