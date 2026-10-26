import React, { useMemo } from "react";
import * as THREE from "three";
import { fbm } from "./ruido";

export type FuncionAltura = (x: number, z: number) => number;

type Opciones = {
  ancho: number;
  largo: number;
  segX: number;
  segZ: number;
  centro?: [number, number];
  altura: FuncionAltura;
  colorNieve?: string;
  colorSombra?: string;
  colorRoca?: string;
  // Pendiente a partir de la cual asoma la roca (1 = plano, 0 = vertical).
  umbralRoca?: number;
  // Variación de brillo de la nieve (huellas del viento, textura).
  grano?: number;
};

// Malla de terreno con colores por vértice: nieve en lo plano, roca en lo empinado.
export const crearTerreno = ({
  ancho,
  largo,
  segX,
  segZ,
  centro = [0, 0],
  altura,
  colorNieve = "#f3f7ff",
  colorSombra = "#cddcf2",
  colorRoca = "#3a404c",
  umbralRoca = 0.62,
  grano = 0,
}: Opciones) => {
  const g = new THREE.PlaneGeometry(ancho, largo, segX, segZ);
  g.rotateX(-Math.PI / 2);
  g.translate(centro[0], 0, centro[1]);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, altura(pos.getX(i), pos.getZ(i)));
  }
  g.computeVertexNormals();
  const nor = g.attributes.normal;
  const nieve = new THREE.Color(colorNieve);
  const sombra = new THREE.Color(colorSombra);
  const roca = new THREE.Color(colorRoca);
  const colores = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const ny = nor.getY(i);
    // Rocas en lo empinado, con un poco de variación para que no sea una línea recta.
    const variacion = Math.sin(pos.getX(i) * 0.37 + pos.getZ(i) * 0.21) * 0.04;
    const kRoca = 1 - THREE.MathUtils.smoothstep(ny, umbralRoca - 0.08 + variacion, umbralRoca + 0.08 + variacion);
    c.copy(nieve).lerp(sombra, THREE.MathUtils.clamp((1 - ny) * 1.6, 0, 1));
    c.lerp(roca, kRoca);
    if (grano > 0) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      c.multiplyScalar(1 + (fbm(x * 0.35, z * 0.9, 3) + fbm(x * 2.1, z * 2.4, 2) * 0.5) * grano);
    }
    colores[i * 3] = c.r;
    colores[i * 3 + 1] = c.g;
    colores[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colores, 3));
  return g;
};

export const Terreno: React.FC<Opciones & { readonly brillo?: number }> = ({ brillo = 1, ...op }) => {
  // La geometría solo depende de la forma; se calcula una vez.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geo = useMemo(() => crearTerreno(op), []);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors roughness={0.93} metalness={0} envMapIntensity={0.6 * brillo} />
    </mesh>
  );
};
