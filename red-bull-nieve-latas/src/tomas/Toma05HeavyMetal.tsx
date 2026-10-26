import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { Atleta, Pose, POSES, poseEn, V3 } from "../three/Atleta";
import { Camara, PlanoCamara, temblor } from "../three/Camara";
import { Banner, Edificios, Farol, Halo, Publico } from "../three/Ciudad";
import { Entorno } from "../three/Entorno";
import { Escena3D } from "../three/Escena3D";
import { Estallido, NieveCayendo } from "../three/Particulas";
import { mezclar, rampa, Rampa, suave, tramo, useT } from "../tiempo";
import { Flash, NieveFrente, RayasVelocidad, Rotulo, Vineta } from "../ui/Efectos";

// TOMA 5 (8–10 s) · NIEVE · Red Bull Heavy Metal (snowboard urbano)
// De noche, en plena ciudad: el rider sube a la baranda en bajada y se desliza de costado
// (boardslide) entre luces, público y nieve que cae.

const RAMPA: Rampa = [
  [0, 1.4],
  [10, 1.2],
  [16, 0.4],
  [40, 0.4],
  [48, 1.6],
  [60, 1.8],
];

// Baranda: tramo plano, quiebre y bajada.
const PUNTOS_BARANDA: V3[] = [
  [-9, 2.6, 0],
  [-5, 2.6, 0],
  [6, -0.2 + 0.9, 0],
];
const V = 6.5; // m/s sobre la baranda

const enBaranda = (x: number) => {
  if (x <= -5) return 2.6;
  return 2.6 + ((x + 5) / 11) * (0.7 - 2.6);
};
const pendienteBaranda = (x: number) => (x <= -5 ? 0 : Math.atan((0.7 - 2.6) / 11));

const X_INICIO = -15;
const X_SUBE = -9.2;
const X_BAJA = 6;

const estado = (ta: number) => {
  const x = X_INICIO + V * (ta / 30);
  if (x < X_SUBE) {
    // Viene por la plataforma de largada (rampa de andamios con nieve).
    const y = 2.1 + Math.max(0, (X_SUBE - x) * 0.25);
    return { x, y, giro: 0, inclina: 0.25, fase: "entrada" as const };
  }
  if (x < X_BAJA) {
    const k = THREE.MathUtils.clamp((x - X_SUBE) / 0.8, 0, 1);
    return { x, y: enBaranda(x) + 0.06 + Math.sin(k * Math.PI) * 0.35, giro: (Math.PI / 2) * suave(k), inclina: pendienteBaranda(x) * 0.6, fase: "baranda" as const };
  }
  const s = (x - X_BAJA) / V;
  const y = Math.max(0, 0.76 + 1.5 * s - 4.9 * s * s);
  return { x, y, giro: (Math.PI / 2) * (1 - suave(s / 0.35)), inclina: 0, fase: "salida" as const };
};

const posesClave = (): (readonly [number, Pose])[] => {
  const f = (x: number) => ((x - X_INICIO) / V) * 30;
  return [
    [f(X_SUBE) - 6, POSES.snowBajada],
    [f(X_SUBE) - 2, POSES.snowCompresion],
    [f(X_SUBE) + 1, POSES.snowPop],
    [f(X_SUBE) + 6, POSES.snowSlide],
    [f(X_BAJA) - 1, POSES.snowSlide],
    [f(X_BAJA) + 3, POSES.snowPop],
    [f(X_BAJA) + 9, POSES.snowAterrizaje],
  ];
};

const Baranda: React.FC = () => {
  const geo = useMemo(() => {
    const curva = new THREE.CatmullRomCurve3(PUNTOS_BARANDA.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.05);
    return new THREE.TubeGeometry(curva, 80, 0.045, 10, false);
  }, []);
  return (
    <>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#d7dbe3" metalness={1} roughness={0.18} />
      </mesh>
      {[-8.5, -5, -1, 3, 5.6].map((x) => (
        <mesh key={x} position={[x, enBaranda(x) / 2, 0]}>
          <cylinderGeometry args={[0.035, 0.035, enBaranda(x), 8]} />
          <meshStandardMaterial color="#9aa0ab" metalness={1} roughness={0.3} />
        </mesh>
      ))}
    </>
  );
};

const Plataforma: React.FC = () => (
  <>
    {/* Rampa de andamios cubierta de nieve que lleva a la baranda */}
    <mesh position={[-14, 1.05, 0]} rotation={[0, 0, -0.2]}>
      <boxGeometry args={[11, 2.4, 6]} />
      <meshStandardMaterial color="#f4f8ff" roughness={0.9} />
    </mesh>
    <mesh position={[-9.4, 1.0, 0]}>
      <boxGeometry args={[1.2, 2.0, 6]} />
      <meshStandardMaterial color="#eef4ff" roughness={0.9} />
    </mesh>
    {/* Andamios */}
    {[-18, -15, -12, -10].map((x) =>
      [-2.8, 2.8].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 1, z]}>
          <cylinderGeometry args={[0.05, 0.05, 2.2, 6]} />
          <meshStandardMaterial color="#8a909c" metalness={0.9} roughness={0.35} />
        </mesh>
      )),
    )}
    <Banner pos={[-14, 1.4, 3.05]} ancho={9} alto={1.4} rot={[0, 0, -0.2]} />
  </>
);

const planoEn = (t: number, r: V3): PlanoCamara => {
  // Dolly lateral al ras, acompañando; en la cámara lenta se adelanta y gira un poco.
  const k = suave(tramo(t, 0, 60));
  const sac = temblor(t, 0.02);
  return {
    pos: [r[0] + mezclar(-4.5, 3.6, k), mezclar(3.4, 2.1, k), mezclar(10.5, 7.4, k)],
    mirar: [r[0] + 0.4 + sac[0], r[1] + 0.9 + sac[1], 0],
    fov: mezclar(36, 29, k),
    giro: mezclar(0.08, -0.06, k),
  };
};

export const Toma05HeavyMetal: React.FC = () => {
  const t = useT();
  const ta = rampa(t, RAMPA);
  const r = estado(ta);
  const pose = poseEn(posesClave(), ta);
  const plano = planoEn(t, [r.x, r.y, 0]);
  const tSube = ((X_SUBE - X_INICIO) / V) * 30;
  const tBaja = ((X_BAJA - X_INICIO) / V) * 30;

  return (
    <AbsoluteFill style={{ backgroundColor: "#03060f" }}>
      <Escena3D filtro="contrast(1.12) saturate(1.2)">
        <Camara {...plano} />
        <color attach="background" args={["#050915"]} />
        <fog attach="fog" args={["#0a1124", 30, 140]} />
        <Entorno tipo="noche" intensidad={0.8} />
        <hemisphereLight args={["#2a3a78", "#0a0d18", 0.35]} />
        {/* Reflectores sobre la baranda */}
        <spotLight position={[-2, 14, 8]} angle={0.5} penumbra={0.6} intensity={900} distance={60} decay={2} color="#dfe8ff" />
        <spotLight position={[4, 12, -6]} angle={0.5} penumbra={0.6} intensity={500} distance={50} decay={2} color="#9fb6ff" />
        <Halo pos={[-2, 14, 8]} tam={5} color="#dfe8ff" />
        {/* Luz de contorno que sigue al rider para despegarlo del fondo */}
        <pointLight position={[r.x - 2, r.y + 3, -3]} intensity={70} distance={12} decay={2} color="#7fa2ff" />
        <pointLight position={[r.x + 2, r.y + 2, 5]} intensity={40} distance={12} decay={2} color="#ffe2c0" />
        <Halo pos={[4, 12, -6]} tam={5} color="#9fb6ff" />
        <Edificios />
        {[
          [-12, -7],
          [-1, -7],
          [10, -7],
          [-6, 9],
          [8, 9],
        ].map(([x, z]) => (
          <Farol key={`${x}${z}`} pos={[x, z]} />
        ))}
        {/* Piso nevado de la plaza */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial color="#cdd8ec" roughness={0.85} />
        </mesh>
        <Plataforma />
        <Baranda />
        <Publico desde={-16} hasta={14} z={-6} t={t} />
        <group position={[r.x, r.y, 0]} rotation={[0, r.giro, 0]}>
          <group rotation={[0, 0, 0]}>
            <group rotation={[r.fase === "baranda" ? -r.inclina : 0, 0, r.fase === "entrada" ? -0.2 : 0]}>
              <Atleta tipo="snowboard" pose={pose} colorCampera="#eef2fa" />
            </group>
          </group>
        </group>
        {/* Chispas del metal mientras desliza */}
        <Estallido
          cantidad={700}
          origen={[r.x, r.y - 0.02, 0]}
          edad={r.fase === "baranda" ? (ta - tSube - 2) / 30 : -1}
          direccion={[-1, 0.5, 0.2]}
          apertura={0.7}
          velocidad={2.4}
          gravedad={6}
          vida={0.35}
          tam={0.35}
          aditivo
          color="#ffb347"
          color2="#fff1c0"
          emision={1.4}
          semilla="chispas"
        />
        <Estallido cantidad={1200} origen={[X_BAJA + 2.6, 0.15, 0]} edad={(ta - tBaja - 9) / 30} direccion={[1, 0.8, 0.5]} apertura={0.55} velocidad={6} gravedad={4} vida={1.4} tam={2.6} color="#eef4ff" semilla="aterriza5" />
        <NieveCayendo cantidad={3200} centro={[r.x, 4, 2]} caja={[30, 12, 20]} tiempo={ta} caida={0.06} viento={[0.015, 0.005]} tam={1.1} opacidad={0.95} />
      </Escena3D>
      <NieveFrente t={ta} cantidad={22} velocidad={[-3, 7]} opacidad={0.5} tam={1.2} semilla="t5" color="255,236,210" />
      <RayasVelocidad fuerza={0.45 * Math.max(1 - tramo(t, 2, 10), tramo(t, 46, 54))} t={t} />
      <Vineta fuerza={0.55} />
      <Rotulo nombre="RED BULL HEAVY METAL" lugar="BOSTON · EE.UU." t={t - 10} x={110} y={90} tam={112} salida={t - 52} />
      <Flash fuerza={Math.max(0.7 * (1 - tramo(t, 0, 6)), tramo(t, 57, 60) * 0.5)} />
    </AbsoluteFill>
  );
};
