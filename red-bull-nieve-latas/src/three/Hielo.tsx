import React, { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

// Lago congelado: un espejo real (refleja las latas) + una capa de hielo rayado encima.
let cacheRayas: THREE.CanvasTexture | null = null;
const texturaRayas = () => {
  if (cacheRayas) return cacheRayas;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 1024, 1024);
  // Rayones finos de patines y burbujas atrapadas en el hielo.
  for (let i = 0; i < 260; i++) {
    const x = random(`hx${i}`) * 1024;
    const y = random(`hy${i}`) * 1024;
    const a = random(`ha${i}`) * Math.PI;
    const l = 30 + random(`hl${i}`) * 220;
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + random(`ho${i}`) * 0.18})`;
    ctx.lineWidth = 0.6 + random(`hw${i}`) * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y + Math.sin(a + 0.4) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  for (let i = 0; i < 400; i++) {
    const x = random(`bx${i}`) * 1024;
    const y = random(`by${i}`) * 1024;
    const r = 1 + random(`br${i}`) * 4;
    ctx.fillStyle = `rgba(230,245,255,${0.08 + random(`bo${i}`) * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  cacheRayas = new THREE.CanvasTexture(c);
  cacheRayas.wrapS = THREE.RepeatWrapping;
  cacheRayas.wrapT = THREE.RepeatWrapping;
  cacheRayas.repeat.set(6, 6);
  cacheRayas.anisotropy = 8;
  return cacheRayas;
};

export const Hielo: React.FC<{ readonly tam?: number; readonly tinte?: string }> = ({ tam = 400, tinte = "#7f98b8" }) => {
  const espejo = useMemo(() => {
    const r = new Reflector(new THREE.PlaneGeometry(tam, tam), {
      textureWidth: 1024,
      textureHeight: 576,
      color: new THREE.Color(tinte),
      clipBias: 0.003,
    });
    r.rotateX(-Math.PI / 2);
    return r;
  }, [tam, tinte]);
  const rayas = useMemo(() => texturaRayas(), []);
  return (
    <>
      <primitive object={espejo} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <planeGeometry args={[tam, tam]} />
        <meshStandardMaterial
          color="#cfe6ff"
          map={rayas}
          transparent
          opacity={0.55}
          roughness={0.25}
          metalness={0}
          depthWrite={false}
        />
      </mesh>
    </>
  );
};

// Huella que tallan las latas en el hielo: una cinta que se dibuja hasta "progreso".
export const Huella: React.FC<{
  readonly puntos: readonly [number, number][]; // (x, z) a lo largo del recorrido
  readonly progreso: number; // 0..1
  readonly ancho?: number;
}> = ({ puntos, progreso, ancho = 0.09 }) => {
  const geo = useMemo(() => {
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i < puntos.length; i++) {
      const [x, z] = puntos[i];
      const [xa, za] = puntos[Math.max(0, i - 1)];
      const [xb, zb] = puntos[Math.min(puntos.length - 1, i + 1)];
      let dx = xb - xa;
      let dz = zb - za;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l;
      dz /= l;
      pos.push(x - dz * ancho, 0.008, z + dx * ancho, x + dz * ancho, 0.008, z - dx * ancho);
      if (i > 0) {
        const b = (i - 1) * 2;
        idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    return g;
  }, [puntos, ancho]);
  const n = Math.floor(Math.max(0, Math.min(1, progreso)) * (puntos.length - 1));
  geo.setDrawRange(0, n * 6);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color="#eef7ff" transparent opacity={0.75} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};
