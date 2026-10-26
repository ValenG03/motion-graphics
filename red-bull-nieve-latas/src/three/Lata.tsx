import React, { useMemo } from "react";
import * as THREE from "three";
import { VarianteLata } from "../marca";
import {
  escarcha as canvasEscarcha,
  etiquetaLata,
  gotasCondensacion,
  grietas as canvasGrietas,
  metalRugosidadLata,
} from "./texturasLata";

// Medidas de una lata slim de 250 ml (1 unidad = 50 mm). El origen está en el centro.
export const RADIO_LATA = 0.53;
export const ALTO_LATA = 2.68;
const Y_CUERPO_ABAJO = -1.22;
const Y_CUERPO_ARRIBA = 1.07;
const Y_TAPA = 1.275;

const geoCuerpo = new THREE.CylinderGeometry(
  RADIO_LATA,
  RADIO_LATA,
  Y_CUERPO_ARRIBA - Y_CUERPO_ABAJO,
  128,
  1,
  true,
  -Math.PI / 2,
);
geoCuerpo.translate(0, (Y_CUERPO_ARRIBA + Y_CUERPO_ABAJO) / 2, 0);

const capa = (k: number) => {
  const g = new THREE.CylinderGeometry(
    RADIO_LATA * k,
    RADIO_LATA * k,
    Y_CUERPO_ARRIBA - Y_CUERPO_ABAJO + 0.02,
    96,
    1,
    true,
    -Math.PI / 2,
  );
  g.translate(0, (Y_CUERPO_ARRIBA + Y_CUERPO_ABAJO) / 2, 0);
  return g;
};
const geoGotas = capa(1.004);
const geoEscarcha = capa(1.018);

const perfil = (pts: [number, number][]) => pts.map(([r, y]) => new THREE.Vector2(r, y));

const geoHombro = new THREE.LatheGeometry(
  perfil([
    [0.53, 1.07],
    [0.526, 1.11],
    [0.495, 1.19],
    [0.467, 1.255],
    [0.468, 1.3],
    [0.476, 1.333],
    [0.466, 1.346],
    [0.452, 1.336],
    [0.446, 1.292],
    [0.43, Y_TAPA],
    [0.0, Y_TAPA],
  ]),
  96,
);

const geoFondo = new THREE.LatheGeometry(
  perfil([
    [0.0, -1.25],
    [0.28, -1.29],
    [0.38, -1.325],
    [0.43, -1.34],
    [0.48, -1.326],
    [0.515, -1.28],
    [0.53, -1.22],
  ]),
  96,
);

// Anilla: rectángulo redondeado con agujero, extruido.
const geoAnilla = (() => {
  const s = new THREE.Shape();
  const w = 0.17;
  const h = 0.36;
  const r = 0.08;
  s.moveTo(-w + r, -h / 2);
  s.lineTo(w - r, -h / 2);
  s.quadraticCurveTo(w, -h / 2, w, -h / 2 + r);
  s.lineTo(w, h / 2 - r);
  s.quadraticCurveTo(w, h / 2, w - r, h / 2);
  s.lineTo(-w + r, h / 2);
  s.quadraticCurveTo(-w, h / 2, -w, h / 2 - r);
  s.lineTo(-w, -h / 2 + r);
  s.quadraticCurveTo(-w, -h / 2, -w + r, -h / 2);
  const agujero = new THREE.Path();
  agujero.absellipse(0, -0.06, 0.1, 0.075, 0, Math.PI * 2, true, 0);
  s.holes.push(agujero);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
    curveSegments: 16,
  });
  g.rotateX(-Math.PI / 2);
  // La bisagra (remache) queda en el origen.
  g.translate(0, 0, -0.1);
  return g;
})();

const geoRemache = new THREE.CylinderGeometry(0.04, 0.045, 0.03, 20);

const textura = (c: HTMLCanvasElement, srgb: boolean) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  t.wrapS = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
};

export type PropsLata = {
  readonly variante: VarianteLata;
  readonly condensacion?: number;
  readonly escarcha?: number;
  // 0..1: el hielo cubre la lata de abajo hacia arriba (toma Winter Edition).
  readonly hielo?: number;
  readonly grietas?: number;
  readonly abrir?: number;
  readonly opacidad?: number;
  readonly brillo?: number;
};

export const Lata: React.FC<PropsLata> = ({
  variante,
  condensacion = 0,
  escarcha = 0,
  hielo = 0,
  grietas = 0,
  abrir = 0,
  opacidad = 1,
  brillo = 1,
}) => {
  // Las fuentes ya están cargadas: <ConFuentes> envuelve toda la composición.
  const texturas = useMemo(() => {
    return {
      etiqueta: textura(etiquetaLata(variante), true),
      mr: textura(metalRugosidadLata(variante), false),
      gotas: textura(gotasCondensacion(), false),
      escarcha: textura(canvasEscarcha().color, true),
      crecimiento: textura(canvasEscarcha().crecimiento, false),
      grietas: textura(canvasGrietas(), false),
    };
  }, [variante]);

  const transparente = opacidad < 0.999;
  return (
    <group>
      <mesh geometry={geoCuerpo}>
        <meshStandardMaterial
          map={texturas.etiqueta}
          metalnessMap={texturas.mr}
          roughnessMap={texturas.mr}
          metalness={1}
          roughness={1}
          envMapIntensity={1.15 * brillo}
          transparent={transparente}
          opacity={opacidad}
        />
      </mesh>
      <mesh geometry={geoHombro}>
        <meshStandardMaterial
          color="#d6d9df"
          metalness={1}
          roughness={0.2}
          side={THREE.DoubleSide}
          envMapIntensity={brillo}
          transparent={transparente}
          opacity={opacidad}
        />
      </mesh>
      <mesh geometry={geoFondo}>
        <meshStandardMaterial
          color="#c9ccd2"
          metalness={1}
          roughness={0.28}
          side={THREE.DoubleSide}
          envMapIntensity={brillo}
          transparent={transparente}
          opacity={opacidad}
        />
      </mesh>
      <group position={[0, Y_TAPA + 0.012, 0.02]}>
        <mesh geometry={geoRemache}>
          <meshStandardMaterial color="#cfd2d8" metalness={1} roughness={0.25} />
        </mesh>
        <mesh geometry={geoAnilla} rotation={[-abrir * 1.25, 0, 0]} position={[0, 0.01, 0]}>
          <meshStandardMaterial
            color="#dfe2e8"
            metalness={1}
            roughness={0.18}
            transparent={transparente}
            opacity={opacidad}
          />
        </mesh>
        {abrir > 0.4 ? (
          <mesh position={[0, -0.004, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.1, 24]} />
            <meshBasicMaterial color="#0b0d12" />
          </mesh>
        ) : null}
      </group>
      {condensacion > 0.001 ? (
        <mesh geometry={geoGotas}>
          <meshPhysicalMaterial
            color="#ffffff"
            alphaMap={texturas.gotas}
            bumpMap={texturas.gotas}
            bumpScale={2.5}
            transparent
            opacity={Math.min(1, condensacion)}
            roughness={0.04}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.02}
            envMapIntensity={2.4}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      {escarcha > 0.001 || hielo > 0.001 ? (
        <mesh geometry={geoEscarcha}>
          <meshPhysicalMaterial
            map={texturas.escarcha}
            alphaMap={texturas.crecimiento}
            transparent
            opacity={1}
            // El hielo crece de abajo hacia arriba: se descarta lo que todavía no "nació".
            alphaTest={Math.max(0.002, 1 - Math.max(hielo, escarcha * 0.4))}
            roughness={0.35}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.1}
            emissive="#bfe6ff"
            emissiveMap={texturas.grietas}
            emissiveIntensity={grietas * 3.5}
            envMapIntensity={1.6}
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </group>
  );
};
