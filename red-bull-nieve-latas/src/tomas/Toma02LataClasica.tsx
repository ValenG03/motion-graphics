import React, { useMemo } from "react";
import { AbsoluteFill, random } from "remotion";
import * as THREE from "three";
import { COLORES } from "../marca";
import { Camara } from "../three/Camara";
import { Entorno } from "../three/Entorno";
import { Escena3D } from "../three/Escena3D";
import { ALTO_LATA, Lata, RADIO_LATA } from "../three/Lata";
import { Estallido, NieveCayendo } from "../three/Particulas";
import { mezclar, rampa, Rampa, salidaExpo, suave, tramo, useT } from "../tiempo";
import { Flash, NieveFrente, Rotulo, Vineta } from "../ui/Efectos";

// TOMA 2 (2–4 s) · LATA
// La nieve que levantó la tabla gira en remolino y se "pega" sobre la superficie de la lata:
// aparece la Red Bull clásica, gira en 3D con gotas y escarcha, y se abre con un "pssst".

const RAMPA: Rampa = [
  [0, 1.4],
  [16, 1.2],
  [24, 0.45],
  [46, 0.45],
  [52, 2.6],
  [60, 3.4],
];

// Copos que vuelan hacia la lata y se acomodan en su superficie.
const NieveQueFormaLata: React.FC<{ readonly k: number; readonly opacidad: number }> = ({ k, opacidad }) => {
  const { geo, mat } = useMemo(() => {
    const n = 5200;
    const inicio = new Float32Array(n * 3);
    const fin = new Float32Array(n * 3);
    const extra = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      // Salen de una nube amplia frente a la cámara (la nieve del aterrizaje).
      const a = random(`ia${i}`) * Math.PI * 2;
      const rr = 2 + random(`ir${i}`) * 9;
      inicio[i * 3] = Math.cos(a) * rr;
      inicio[i * 3 + 1] = (random(`iy${i}`) - 0.5) * 9;
      inicio[i * 3 + 2] = Math.sin(a) * rr * 0.6 + 2;
      // Llegan a un punto de la superficie de la lata.
      const th = random(`ft${i}`) * Math.PI * 2;
      const y = -ALTO_LATA / 2 + random(`fy${i}`) * ALTO_LATA;
      const rLata = Math.abs(y) > 1.1 ? RADIO_LATA * 0.88 : RADIO_LATA * 1.01;
      fin[i * 3] = Math.cos(th) * rLata;
      fin[i * 3 + 1] = y;
      fin[i * 3 + 2] = Math.sin(th) * rLata;
      extra[i * 2] = random(`fd${i}`);
      extra[i * 2 + 1] = 0.5 + random(`fs${i}`);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(fin, 3));
    g.setAttribute("inicio", new THREE.BufferAttribute(inicio, 3));
    g.setAttribute("extra", new THREE.BufferAttribute(extra, 2));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uK: { value: 0 }, uOpacidad: { value: 1 }, uAlto: { value: 1080 } },
      vertexShader: /* glsl */ `
        attribute vec3 inicio;
        attribute vec2 extra;
        uniform float uK;
        uniform float uAlto;
        varying float vA;
        void main() {
          // Cada copo arranca con un pequeño retraso; llega con frenado suave.
          float k = clamp((uK - extra.x * 0.35) / 0.65, 0.0, 1.0);
          float e = 1.0 - pow(1.0 - k, 3.0);
          // Remolino: gira alrededor del eje de la lata mientras se acerca.
          float ang = (1.0 - e) * 5.0 * (0.6 + extra.y * 0.5);
          vec3 p = mix(inicio, position, e);
          float c = cos(ang), s = sin(ang);
          p.xz = mat2(c, -s, s, c) * p.xz;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(extra.y * 0.05 * uAlto / max(0.1, -mv.z) * (1.6 - e), 1.0, 40.0);
          vA = smoothstep(0.0, 0.08, uK);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacidad;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(vec3(0.92, 0.96, 1.0), smoothstep(0.5, 0.1, d) * vA * uOpacidad * 0.75);
        }
      `,
    });
    return { geo: g, mat: m };
  }, []);
  mat.uniforms.uK.value = k;
  mat.uniforms.uOpacidad.value = opacidad;
  if (opacidad <= 0.001) return null;
  return <points geometry={geo} material={mat} frustumCulled={false} />;
};

export const Toma02LataClasica: React.FC = () => {
  const t = useT();
  const ta = rampa(t, RAMPA);
  const kForma = tramo(ta, 0, 26);
  const aparece = suave(tramo(ta, 17, 27));
  // Giro: rápido mientras se forma, lento en el plano heroico, latigazo al final.
  const giro = mezclar(-4.2, 0.14, salidaExpo(tramo(ta, 0, 40))) + Math.max(0, ta - 40) * 0.09;
  const abrir = suave(tramo(ta, 47, 51));
  const pos: [number, number, number] = [mezclar(0.4, 1.1, suave(tramo(ta, 8, 40))) - Math.max(0, ta - 52) * 0.06, mezclar(1.0, 0.25, suave(tramo(ta, 0, 40))), mezclar(8.5, 6.1, suave(tramo(ta, 0, 52))) - Math.max(0, ta - 52) * 0.16];
  const luz = Math.sin(ta * 0.09) * 3;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 38% 45%, #1d3f8f 0%, ${COLORES.azulProfundo} 45%, #02040c 100%)`,
      }}
    >
      {/* Haces de luz diagonales detrás de la lata */}
      <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.55 * aparece }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 300 + i * 260 + ta * 3,
              top: -200,
              width: 90 + i * 30,
              height: 1600,
              rotate: "28deg",
              background: "linear-gradient(90deg, rgba(120,170,255,0) 0%, rgba(150,190,255,0.35) 50%, rgba(120,170,255,0) 100%)",
              filter: "blur(18px)",
            }}
          />
        ))}
      </AbsoluteFill>
      <Escena3D filtro="contrast(1.12) saturate(1.1)">
        <Camara pos={pos} mirar={[-0.35, 0.05, 0]} fov={34} giro={mezclar(0.12, -0.03, suave(tramo(ta, 0, 40)))} />
        <Entorno tipo="estudio" intensidad={1.1} />
        <ambientLight intensity={0.15} />
        <directionalLight position={[3 + luz, 4, 5]} intensity={1.6} color="#ffffff" />
        <pointLight position={[-3, 1.5, -2]} intensity={14} color="#4f7bd8" />
        <pointLight position={[3, -1, -2]} intensity={10} color="#ffd2a0" />
        <group position={[-1.45, 0, 0]} rotation={[0.08, giro, -0.05]}>
          <Lata variante="clasica" condensacion={aparece} escarcha={0.5 * aparece} abrir={abrir} opacidad={aparece} />
          <NieveQueFormaLata k={kForma} opacidad={1 - tramo(ta, 22, 30)} />
        </group>
        {/* "Pssst": vapor frío que sale al abrir */}
        <Estallido
          cantidad={1100}
          origen={[-1.45, ALTO_LATA / 2 + 0.05, 0.15]}
          edad={(ta - 48) / 30}
          direccion={[0.25, 1, 0.3]}
          apertura={0.4}
          velocidad={3.2}
          gravedad={-0.6}
          arrastre={2}
          vida={1.6}
          tam={4.2}
          color="#dfeeff"
          emision={0.25}
          semilla="pssst"
        />
        <NieveCayendo cantidad={500} centro={[0, 0, -2]} caja={[14, 9, 6]} tiempo={ta} caida={0.02} viento={[0.01, 0]} tam={0.5} opacidad={0.5 * aparece} />
      </Escena3D>
      <NieveFrente t={ta} cantidad={12} velocidad={[3, 2]} opacidad={0.45} tam={1.3} semilla="t2" />
      <Rotulo nombre="RED BULL" lugar="ENERGY DRINK" t={t - 22} x={1030} y={410} tam={150} salida={t - 52} />
      <Vineta fuerza={0.5} />
      <Flash fuerza={Math.max(1 - tramo(t, 0, 9), 0.6 * (1 - tramo(t, 18, 26)) * (t >= 18 ? 1 : 0) * 0.5, tramo(t, 57, 60) * 0.6)} />
    </AbsoluteFill>
  );
};
