import React, { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, random } from "remotion";
import * as THREE from "three";
import { COLORES, FUENTE_DEPORTE, FUENTE_TITULO } from "../marca";
import { Camara, temblor } from "../three/Camara";
import { Entorno } from "../three/Entorno";
import { Escena3D } from "../three/Escena3D";
import { ALTO_LATA, Lata, RADIO_LATA } from "../three/Lata";
import { Estallido, NieveCayendo } from "../three/Particulas";
import { mezclar, rampa, Rampa, salidaExpo, suave, tramo, useT } from "../tiempo";
import { Flash, NieveFrente, Vineta } from "../ui/Efectos";

// TOMA 8 (14–16 s) · LATAS · Winter Edition (Vanilla Berry, la de Argentina)
// El hielo trepa por la lata, aparecen grietas que brillan y el hielo estalla en esquirlas.

const RAMPA: Rampa = [
  [0, 1],
  [36, 1],
  [39, 0.32],
  [54, 0.32],
  [60, 1.2],
];
const IMPACTO = 38; // cuadro de acción en que estalla el hielo

// Esquirlas de hielo: cada una sale de la superficie de la lata girando sobre sí misma.
const Esquirlas: React.FC<{ readonly edad: number }> = ({ edad }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = 320;
  const datos = useMemo(
    () =>
      new Array(n).fill(0).map((_, i) => {
        const r = (k: string) => random(`esq${k}${i}`);
        const th = r("t") * Math.PI * 2;
        return {
          th,
          y: -ALTO_LATA / 2 + r("y") * ALTO_LATA,
          vel: 1.2 + r("v") * 3,
          sube: (r("u") - 0.3) * 2.5,
          eje: new THREE.Vector3(r("a") - 0.5, r("b") - 0.5, r("c") - 0.5).normalize(),
          giro: 4 + r("g") * 14,
          tam: 0.5 + r("s") * 1.4,
        };
      }),
    [],
  );
  const geo = useMemo(() => {
    const g = new THREE.TetrahedronGeometry(0.11, 0);
    g.scale(1, 0.35, 1.6);
    return g;
  }, []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const mat = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = Math.max(0, edad);
    datos.forEach((d, i) => {
      const k = (1 - Math.exp(-1.4 * e)) / 1.4;
      const radio = RADIO_LATA * 1.04 + d.vel * k;
      const pos = new THREE.Vector3(Math.cos(d.th) * radio, d.y + d.sube * k - 2.2 * e * e, Math.sin(d.th) * radio);
      q.setFromAxisAngle(d.eje, d.giro * e + d.th);
      const s = edad < 0 ? 0.0001 : d.tam * (1 - Math.min(1, e / 2.2));
      mat.compose(pos, q, new THREE.Vector3(s, s, s));
      m.setMatrixAt(i, mat);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[geo, undefined, n]} frustumCulled={false}>
      <meshPhysicalMaterial color="#e6f6ff" roughness={0.05} metalness={0} clearcoat={1} transparent opacity={0.88} envMapIntensity={2.2} emissive="#9fd8ff" emissiveIntensity={0.25} />
    </instancedMesh>
  );
};

// Escarcha en los bordes de la imagen (como una lente que se congela).
const LenteCongelada: React.FC<{ readonly fuerza: number }> = ({ fuerza }) =>
  fuerza > 0.01 ? (
    <AbsoluteFill style={{ opacity: fuerza, pointerEvents: "none" }}>
      <svg width={1920} height={1080}>
        <defs>
          <filter id="escarcha-lente" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves={4} seed={7} />
            <feColorMatrix type="matrix" values="0 0 0 0 0.9  0 0 0 0 0.96  0 0 0 0 1  0 0 0 2.4 -1.1" />
          </filter>
          <radialGradient id="borde-lente" cx="50%" cy="50%" r="72%">
            <stop offset="55%" stopColor="#000" />
            <stop offset="100%" stopColor="#fff" />
          </radialGradient>
          <mask id="mascara-lente">
            <rect width={1920} height={1080} fill="url(#borde-lente)" />
          </mask>
        </defs>
        <rect width={1920} height={1080} filter="url(#escarcha-lente)" mask="url(#mascara-lente)" />
      </svg>
    </AbsoluteFill>
  ) : null;

export const Toma08WinterEdition: React.FC = () => {
  const t = useT();
  const ta = rampa(t, RAMPA);
  const hielo = suave(tramo(ta, 3, 28));
  const grietas = tramo(ta, 29, IMPACTO);
  const roto = ta >= IMPACTO;
  const edad = (ta - IMPACTO) / 30;
  const tension = grietas * (roto ? 0 : 1);
  const tb = temblor(t * 5, 0.03 * tension + (roto ? 0.08 * Math.exp(-(t - 38) / 4) : 0));
  const k = suave(tramo(t, 0, 60));
  const plano = {
    pos: [mezclar(-1.2, 0.9, k) + tb[0], mezclar(1.2, 0.35, k) + tb[1], mezclar(7.4, 5.6, k)] as [number, number, number],
    mirar: [0, 0.1, 0] as [number, number, number],
    fov: 32,
    giro: mezclar(-0.08, 0.04, k),
  };
  const titulo = salidaExpo(tramo(t, 42, 50));

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #1a4a7a 0%, #0a1d3a 45%, #02060f 100%)" }}>
      <Escena3D filtro="contrast(1.1) saturate(1.1)">
        <Camara {...plano} />
        <Entorno tipo="estudio" intensidad={1.1} />
        <ambientLight intensity={0.15} />
        <directionalLight position={[-3, 5, 4]} intensity={1.6} color="#e4f2ff" />
        <pointLight position={[2.5, 0.5, 2]} intensity={roto ? 25 : 10} distance={8} color="#b9a6ff" />
        <pointLight position={[-2.5, -1, -2]} intensity={14} distance={8} color="#6fc4ff" />
        <group rotation={[0.05, -0.25 + ta * 0.011, -0.04]}>
          <Lata variante="winter" condensacion={roto ? 0.9 : 0.3} hielo={roto ? 0 : hielo} grietas={roto ? 0 : grietas} brillo={1.15} />
          <Esquirlas edad={roto ? edad : -1} />
        </group>
        {/* Polvo de hielo al estallar */}
        <Estallido cantidad={1800} origen={[0, 0, 0]} edad={edad} apertura={1} velocidad={5} gravedad={0.8} arrastre={1.4} vida={2} tam={1.2} aditivo color="#cfeeff" color2="#ffffff" semilla="hielo8" />
        {/* Cristales que se juntan mientras se congela */}
        <Estallido cantidad={500} origen={[0, 0, 0]} edad={ta < IMPACTO ? 1.4 - hielo * 1.2 : -1} apertura={1} velocidad={3.5} gravedad={0} arrastre={0.6} vida={2.5} tam={0.6} aditivo color="#e6f6ff" semilla="cristales" />
        <NieveCayendo cantidad={600} centro={[0, 0, -2]} caja={[14, 9, 8]} tiempo={ta} caida={0.02} viento={[0.012, 0]} tam={0.5} opacidad={0.6} />
      </Escena3D>
      <LenteCongelada fuerza={(roto ? Math.max(0, 1 - (t - 38) / 5) : hielo) * 0.75} />
      <NieveFrente t={ta} cantidad={12} velocidad={[2, 3]} opacidad={0.45} semilla="t8" />
      <Vineta fuerza={0.5} />
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            right: 120,
            top: 360,
            textAlign: "right",
            opacity: titulo,
            translate: `${(1 - titulo) * 80}px 0px`,
            filter: `blur(${(1 - titulo) * 10}px)`,
          }}
        >
          <div style={{ fontFamily: FUENTE_DEPORTE, fontWeight: 800, fontStyle: "italic", fontSize: 54, color: COLORES.hielo, letterSpacing: "0.12em" }}>THE WINTER EDITION</div>
          <div style={{ fontFamily: FUENTE_TITULO, fontWeight: 900, fontStyle: "italic", fontSize: 128, lineHeight: 1, color: "#ffffff", textShadow: "0 0 40px rgba(159,216,255,0.8)" }}>
            VANILLA
            <br />
            BERRY
          </div>
        </div>
      </AbsoluteFill>
      <Flash fuerza={Math.max(0.45 * (1 - tramo(t, 0, 4)), roto ? 0.85 * Math.exp(-(t - 38) / 3) : 0, tramo(t, 57, 60) * 0.5)} color="#e8f6ff" />
    </AbsoluteFill>
  );
};
