import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect } from "react";
import * as THREE from "three";

export type TipoEntorno = "estudio" | "nieve" | "noche" | "atardecer";

// Paneles de luz que la lata refleja (como un estudio de fotografía de producto).
type Panel = {
  color: string;
  fuerza: number;
  pos: [number, number, number];
  tam: [number, number, number];
};

const CONFIG: Record<TipoEntorno, { fondoArriba: string; fondoAbajo: string; paneles: Panel[] }> = {
  estudio: {
    fondoArriba: "#0a1430",
    fondoAbajo: "#020308",
    paneles: [
      { color: "#ffffff", fuerza: 7, pos: [0, 9, 3], tam: [10, 0.2, 6] },
      { color: "#ffffff", fuerza: 5, pos: [0, 2, 10], tam: [6, 8, 0.2] },
      { color: "#4f7bd8", fuerza: 6, pos: [-10, 1, -2], tam: [0.2, 9, 1.2] },
      { color: "#ffd2a0", fuerza: 6, pos: [10, 1, -2], tam: [0.2, 9, 1.2] },
      { color: "#ffffff", fuerza: 3, pos: [0, 1, -10], tam: [2, 9, 0.2] },
    ],
  },
  nieve: {
    fondoArriba: "#3f78cc",
    fondoAbajo: "#e9f1fb",
    paneles: [
      { color: "#fff3d0", fuerza: 30, pos: [6, 7, -8], tam: [1.5, 1.5, 1.5] },
      { color: "#ffffff", fuerza: 2.2, pos: [0, -6, 0], tam: [30, 0.2, 30] },
      { color: "#bcd6ff", fuerza: 2.5, pos: [0, 10, 0], tam: [20, 0.2, 20] },
    ],
  },
  noche: {
    fondoArriba: "#050a1c",
    fondoAbajo: "#0b0f1d",
    paneles: [
      { color: "#ffb060", fuerza: 14, pos: [-6, 5, 4], tam: [0.6, 0.6, 0.6] },
      { color: "#ffb060", fuerza: 14, pos: [6, 5, -4], tam: [0.6, 0.6, 0.6] },
      { color: "#3a5cff", fuerza: 7, pos: [0, 2, -10], tam: [8, 1, 0.2] },
      { color: "#ffffff", fuerza: 4, pos: [0, 9, 0], tam: [6, 0.2, 6] },
      { color: "#ff3060", fuerza: 5, pos: [10, 1, 2], tam: [0.2, 5, 1] },
    ],
  },
  atardecer: {
    fondoArriba: "#1c2a6b",
    fondoAbajo: "#ffb27a",
    paneles: [
      { color: "#ffd27a", fuerza: 26, pos: [0, 2, -10], tam: [3, 3, 0.3] },
      { color: "#ffffff", fuerza: 3, pos: [0, 10, 0], tam: [12, 0.2, 12] },
      { color: "#6f8cff", fuerza: 3, pos: [-10, 3, 6], tam: [0.2, 6, 6] },
    ],
  },
};

const construirEscena = (tipo: TipoEntorno) => {
  const cfg = CONFIG[tipo];
  const escena = new THREE.Scene();
  const geo = new THREE.SphereGeometry(30, 32, 16);
  const colores: number[] = [];
  const arriba = new THREE.Color(cfg.fondoArriba);
  const abajo = new THREE.Color(cfg.fondoAbajo);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const k = (pos.getY(i) / 30 + 1) / 2;
    const c = abajo.clone().lerp(arriba, Math.pow(k, 0.8));
    colores.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colores, 3));
  escena.add(
    new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }),
    ),
  );
  for (const p of cfg.paneles) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(p.color).multiplyScalar(p.fuerza),
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(...p.tam), mat);
    m.position.set(...p.pos);
    escena.add(m);
  }
  return escena;
};

export const Entorno: React.FC<{
  readonly tipo: TipoEntorno;
  readonly intensidad?: number;
}> = ({ tipo, intensidad = 1 }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const escena = construirEscena(tipo);
    const rt = pmrem.fromScene(escena, 0.025);
    scene.environment = rt.texture;
    return () => {
      scene.environment = null;
      rt.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, tipo]);
  useLayoutEffect(() => {
    scene.environmentIntensity = intensidad;
  }, [scene, intensidad]);
  return null;
};
