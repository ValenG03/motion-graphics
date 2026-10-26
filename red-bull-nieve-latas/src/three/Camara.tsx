import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect } from "react";
import * as THREE from "three";
import type { V3 } from "./Atleta";

export type PlanoCamara = {
  pos: V3;
  mirar: V3;
  fov: number;
  giro?: number; // inclinación lateral (roll), rad
};

// Coloca la cámara de Three en cada cuadro (antes de que se dibuje).
export const Camara: React.FC<PlanoCamara> = ({ pos, mirar, fov, giro = 0 }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(...mirar);
    if (giro) camera.rotateZ(giro);
    camera.fov = fov;
    camera.near = 0.05;
    camera.far = 4000;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

// Proyecta un punto 3D a la pantalla (para ubicar destellos 2D sobre el sol, etc.).
export const proyectar = (plano: PlanoCamara, punto: V3, ancho: number, alto: number) => {
  const cam = new THREE.PerspectiveCamera(plano.fov, ancho / alto, 0.05, 4000);
  cam.position.set(...plano.pos);
  cam.lookAt(...plano.mirar);
  if (plano.giro) cam.rotateZ(plano.giro);
  cam.updateMatrixWorld();
  const p = new THREE.Vector3(...punto).project(cam);
  return { x: ((p.x + 1) / 2) * ancho, y: ((1 - p.y) / 2) * alto, delante: p.z < 1 };
};

// Curva suave (Catmull-Rom) que pasa por varios puntos: para recorridos de cámara.
export const recorrido = (puntos: readonly V3[], k: number): V3 => {
  const n = puntos.length - 1;
  const x = Math.min(0.99999, Math.max(0, k)) * n;
  const i = Math.floor(x);
  const t = x - i;
  const p0 = puntos[Math.max(0, i - 1)];
  const p1 = puntos[i];
  const p2 = puntos[Math.min(n, i + 1)];
  const p3 = puntos[Math.min(n, i + 2)];
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1]), cr(p0[2], p1[2], p2[2], p3[2])];
};

// Temblor de cámara determinístico (sumas de senos).
export const temblor = (t: number, fuerza: number): V3 => [
  (Math.sin(t * 1.7) * 0.6 + Math.sin(t * 4.3 + 1.2) * 0.4) * fuerza,
  (Math.sin(t * 2.1 + 0.5) * 0.6 + Math.sin(t * 5.1 + 2.3) * 0.4) * fuerza,
  Math.sin(t * 1.3 + 2.0) * 0.5 * fuerza,
];
