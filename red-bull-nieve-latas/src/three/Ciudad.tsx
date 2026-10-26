import React, { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { COLORES, FUENTE_DEPORTE } from "../marca";

// Ciudad de noche: edificios con ventanas encendidas, faroles, público y el banner del evento.

const texturaVentanas = (semilla: string) => {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 256, 512);
  for (let fila = 0; fila < 32; fila++) {
    for (let col = 0; col < 10; col++) {
      const r = random(`${semilla}-${fila}-${col}`);
      if (r < 0.42) continue;
      const calida = r > 0.6;
      ctx.fillStyle = calida
        ? `rgba(255,${190 + Math.round(r * 40)},120,${0.55 + r * 0.45})`
        : `rgba(190,215,255,${0.4 + r * 0.4})`;
      ctx.fillRect(col * 25 + 5, fila * 16 + 4, 15, 9);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export const Edificios: React.FC<{ readonly cantidad?: number }> = ({ cantidad = 26 }) => {
  const datos = useMemo(() => {
    const tex = [texturaVentanas("a"), texturaVentanas("b"), texturaVentanas("c")];
    return new Array(cantidad).fill(0).map((_, i) => {
      const r = (s: string) => random(`ed${s}${i}`);
      const lado = i % 3; // 0: fondo, 1: izquierda, 2: derecha
      const ancho = 10 + r("w") * 16;
      const alto = 18 + r("h") * 55;
      const prof = 10 + r("d") * 12;
      const x = lado === 0 ? -80 + r("x") * 170 : lado === 1 ? -45 - r("x") * 25 : 50 + r("x") * 25;
      const z = lado === 0 ? -34 - r("z") * 40 : -30 + r("z") * 40;
      const mapa = tex[i % 3].clone();
      mapa.needsUpdate = true;
      mapa.wrapS = THREE.RepeatWrapping;
      mapa.wrapT = THREE.RepeatWrapping;
      mapa.repeat.set(ancho / 25, alto / 32);
      return { ancho, alto, prof, x, z, mapa };
    });
  }, [cantidad]);
  return (
    <>
      {datos.map((d, i) => (
        <mesh key={i} position={[d.x, d.alto / 2, d.z]}>
          <boxGeometry args={[d.ancho, d.alto, d.prof]} />
          <meshStandardMaterial color="#0e1220" roughness={0.85} emissive="#ffffff" emissiveMap={d.mapa} emissiveIntensity={1.4} />
        </mesh>
      ))}
    </>
  );
};

let cacheHalo: THREE.CanvasTexture | null = null;
const texturaHalo = () => {
  if (cacheHalo) return cacheHalo;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.15, "rgba(255,255,255,0.8)");
  g.addColorStop(0.4, "rgba(255,255,255,0.2)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  cacheHalo = new THREE.CanvasTexture(c);
  return cacheHalo;
};

// Halo de luz (farol, reflector, celular): sprite aditivo que siempre mira a cámara.
export const Halo: React.FC<{ readonly pos: [number, number, number]; readonly tam: number; readonly color: string; readonly fuerza?: number }> = ({
  pos,
  tam,
  color,
  fuerza = 1,
}) => {
  const mapa = useMemo(() => texturaHalo(), []);
  return (
    <sprite position={pos} scale={[tam, tam, 1]}>
      <spriteMaterial map={mapa} color={new THREE.Color(color).multiplyScalar(fuerza)} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
};

export const Farol: React.FC<{ readonly pos: [number, number]; readonly alto?: number }> = ({ pos, alto = 7 }) => (
  <group position={[pos[0], 0, pos[1]]}>
    <mesh position={[0, alto / 2, 0]}>
      <cylinderGeometry args={[0.08, 0.12, alto, 8]} />
      <meshStandardMaterial color="#1a1d26" roughness={0.6} metalness={0.6} />
    </mesh>
    <mesh position={[0, alto, 0]}>
      <sphereGeometry args={[0.25, 12, 8]} />
      <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
    </mesh>
    <Halo pos={[0, alto, 0]} tam={6} color="#ffb766" fuerza={0.9} />
    <pointLight position={[0, alto - 0.3, 0]} intensity={60} distance={26} decay={2} color="#ffb766" />
  </group>
);

// Público detrás de las vallas, con algunas luces de celular.
export const Publico: React.FC<{ readonly desde: number; readonly hasta: number; readonly z: number; readonly t: number }> = ({ desde, hasta, z, t }) => {
  const personas = useMemo(
    () =>
      new Array(70).fill(0).map((_, i) => ({
        x: desde + (hasta - desde) * random(`px${i}`),
        z: z - random(`pz${i}`) * 3,
        alto: 1.55 + random(`ph${i}`) * 0.35,
        celular: random(`pc${i}`) > 0.72,
        fase: random(`pf${i}`) * 6,
      })),
    [desde, hasta, z],
  );
  return (
    <>
      <mesh position={[(desde + hasta) / 2, 0.55, z + 0.6]}>
        <boxGeometry args={[hasta - desde, 1.1, 0.08]} />
        <meshStandardMaterial color="#2a2f3d" metalness={0.5} roughness={0.5} />
      </mesh>
      {personas.map((p, i) => {
        const salto = Math.max(0, Math.sin(t * 0.25 + p.fase)) * 0.08;
        return (
          <group key={i} position={[p.x, salto, p.z]}>
            <mesh position={[0, p.alto * 0.45, 0]}>
              <capsuleGeometry args={[0.2, p.alto * 0.5, 4, 8]} />
              <meshStandardMaterial color="#0b0d14" roughness={0.9} />
            </mesh>
            <mesh position={[0, p.alto * 0.88, 0]}>
              <sphereGeometry args={[0.12, 8, 6]} />
              <meshStandardMaterial color="#0b0d14" roughness={0.9} />
            </mesh>
            {p.celular ? <Halo pos={[0.15, p.alto + 0.25, 0.2]} tam={0.6} color="#dfe9ff" fuerza={0.8} /> : null}
          </group>
        );
      })}
    </>
  );
};

export const Banner: React.FC<{ readonly pos: [number, number, number]; readonly ancho: number; readonly alto: number; readonly rot?: [number, number, number] }> = ({
  pos,
  ancho,
  alto,
  rot = [0, 0, 0],
}) => {
  const mapa = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = Math.round((1024 * alto) / ancho);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = COLORES.rojo;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = COLORES.azulProfundo;
    ctx.fillRect(0, c.height * 0.82, c.width, c.height * 0.18);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 italic ${Math.round(c.height * 0.5)}px "${FUENTE_DEPORTE}"`;
    ctx.fillText("RED BULL HEAVY METAL", c.width / 2, c.height * 0.42);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [ancho, alto]);
  return (
    <mesh position={pos} rotation={rot}>
      <planeGeometry args={[ancho, alto]} />
      <meshStandardMaterial map={mapa} emissive="#ffffff" emissiveMap={mapa} emissiveIntensity={0.35} roughness={0.7} />
    </mesh>
  );
};
