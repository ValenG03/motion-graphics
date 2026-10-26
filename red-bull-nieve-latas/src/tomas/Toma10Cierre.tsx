import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { COLORES, FUENTE_TITULO, VarianteLata } from "../marca";
import { V3 } from "../three/Atleta";
import { Camara, proyectar, temblor } from "../three/Camara";
import { Cielo } from "../three/Cielo";
import { Entorno } from "../three/Entorno";
import { Escena3D } from "../three/Escena3D";
import { ALTO_LATA, Lata } from "../three/Lata";
import { Estallido, NieveCayendo } from "../three/Particulas";
import { crestas, fbm } from "../three/ruido";
import { Terreno } from "../three/Terreno";
import { mezclar, salidaExpo, suave, tramo, useT } from "../tiempo";
import { Destello, Flash, NieveFrente, Vineta } from "../ui/Efectos";
import { LogoRedBull } from "../ui/LogoRedBull";

// TOMA 10 (18–20 s) · CIERRE
// Todas las latas en fila sobre la cima nevada; arriba aparece el logo con el sol
// y cae la frase final: "RED BULL TE DA AAALAS".

const FILA: VarianteLata[] = ["winter", "sugarfree", "red", "clasica", "green", "zero", "pomelo"];
const SEPARACION = 1.55;
const GOLPE_TOROS = 30;
const GOLPE_FRASE = 45;

// Cima: una loma suave donde se apoyan las latas (escala de lata: 1 unidad = 5 cm).
const cima = (x: number, z: number) => -0.0016 * (x * x + 1.8 * z * z) + fbm(x * 0.08, z * 0.08, 3) * 0.25;
// Cordillera lejana, bien por debajo: da la sensación de estar en la cumbre.
const cordillera = (x: number, z: number) => {
  const r = Math.sqrt(x * x + z * z);
  return -900 + THREE.MathUtils.smoothstep(r, 600, 2400) * crestas(x * 0.0009 + 4, z * 0.0009 - 2, 4) * 900;
};

export const Toma10Cierre: React.FC = () => {
  const t = useT();
  const k = suave(tramo(t, 0, 40));
  const impacto = t >= GOLPE_TOROS ? Math.exp(-(t - GOLPE_TOROS) / 4) : 0;
  const tb = temblor(t * 5, 0.06 * impacto);
  const plano = {
    pos: [mezclar(1.2, 0, k) + tb[0], mezclar(1.0, 2.5, k) + tb[1], mezclar(7, 17.5, k)] as V3,
    mirar: [0, mezclar(1.3, 3.1, k), 0] as V3,
    fov: mezclar(30, 36, k),
    giro: mezclar(0.08, 0, k),
  };
  const solPos: V3 = [0, 1800, -6000];
  const sol = proyectar(plano, solPos, 1920, 1080);

  const bases = useMemo(() => FILA.map((_, i) => (i - 3) * SEPARACION), []);
  const solLogo = salidaExpo(tramo(t, 8, 20));
  const toros = salidaExpo(tramo(t, GOLPE_TOROS - 6, GOLPE_TOROS));
  const texto = salidaExpo(tramo(t, GOLPE_TOROS + 2, GOLPE_TOROS + 9));
  const frase = salidaExpo(tramo(t, GOLPE_FRASE - 3, GOLPE_FRASE + 3));
  const sepFrase = 14 * (1 - tramo(t, GOLPE_FRASE, GOLPE_FRASE + 10));

  return (
    <AbsoluteFill style={{ backgroundColor: "#1d4fb0" }}>
      <Escena3D filtro="contrast(1.08) saturate(1.15)">
        <Camara {...plano} />
        <Entorno tipo="atardecer" intensidad={0.8} />
        <fog attach="fog" args={["#c4d8f0", 1500, 7000]} />
        <Cielo arriba="#0838a8" horizonte="#a9cff2" abajo="#e4ecf7" solDir={[0, 0.29, -1]} solColor="#ffd27a" halo={0.55} curva={0.3} />
        <hemisphereLight args={["#a9c4ff", "#7a7fa0", 0.6]} />
        <directionalLight position={[0, 3, -10]} intensity={2.6} color="#ffd59a" />
        <directionalLight position={[3, 5, 10]} intensity={1.0} color="#dfe8ff" />
        <Terreno ancho={70} largo={40} segX={140} segZ={80} centro={[0, -6]} altura={cima} colorNieve="#f4f6fc" colorSombra="#cdd6ec" grano={0.05} />
        <Terreno ancho={9000} largo={9000} segX={200} segZ={200} altura={cordillera} umbralRoca={0.5} colorNieve="#eef1f8" colorSombra="#b9c4df" colorRoca="#4a4c5c" />
        {FILA.map((v, i) => {
          const x = bases[i];
          const y = cima(x, 0);
          // Caen una tras otra sobre la nieve al empezar la toma.
          const cae = salidaExpo(tramo(t, 2 + Math.abs(i - 3) * 1.5, 10 + Math.abs(i - 3) * 1.5));
          return (
            <group key={v} position={[x, y + ALTO_LATA / 2 - 0.12 + (1 - cae) * 6, 0]} rotation={[0, 0.12 - (i - 3) * 0.04, 0]}>
              <Lata variante={v} condensacion={0.6} escarcha={0.25} brillo={1.15} />
              <mesh position={[0, -ALTO_LATA / 2 + 0.05, 0]} scale={[1, 0.25, 1]}>
                <sphereGeometry args={[0.85, 20, 10]} />
                <meshStandardMaterial color="#f4f7fd" roughness={0.9} />
              </mesh>
            </group>
          );
        })}
        <Estallido cantidad={1200} origen={[0, 0.2, 0]} edad={(t - 4) / 30} direccion={[0, 1, 0.3]} apertura={0.8} velocidad={4} gravedad={2.5} vida={1.6} tam={1.1} color="#ffffff" semilla="cierre" />
        <NieveCayendo cantidad={900} centro={[0, 3, 2]} caja={[20, 10, 14]} tiempo={t} caida={0.03} viento={[0.02, 0.005]} tam={0.6} opacidad={0.75} />
      </Escena3D>
      {/* Rayos de sol detrás del logo */}
      <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.3 * solLogo, pointerEvents: "none" }}>
        <svg width={1920} height={1080}>
          {new Array(18).fill(0).map((_, i) => {
            const a = (i / 18) * Math.PI * 2 + t * 0.006;
            return (
              <polygon
                key={i}
                points={`960,300 ${960 + Math.cos(a - 0.05) * 1400},${300 + Math.sin(a - 0.05) * 1400} ${960 + Math.cos(a + 0.05) * 1400},${300 + Math.sin(a + 0.05) * 1400}`}
                fill="rgba(255,214,120,0.18)"
              />
            );
          })}
        </svg>
      </AbsoluteFill>
      <Destello x={sol.x} y={sol.y} fuerza={sol.delante ? 0.35 : 0} />
      <NieveFrente t={t} cantidad={14} velocidad={[-2, 3]} opacidad={0.45} semilla="t10" />
      <Vineta fuerza={0.4} />
      {/* Logo: el sol crece, los toros entran embistiendo y chocan en el golpe */}
      <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
        <div style={{ marginTop: 70, scale: String(1 + impacto * 0.06), translate: `${tb[0] * 40}px ${tb[1] * 40}px` }}>
          <LogoRedBull ancho={600} sol={solLogo} toros={toros} texto={texto} brilloSol={0.6 + impacto * 1.2} />
        </div>
      </AbsoluteFill>
      {/* Frase final */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 92, pointerEvents: "none" }}>
        <div
          style={{
            fontFamily: FUENTE_TITULO,
            fontWeight: 900,
            fontStyle: "italic",
            fontSize: 132,
            lineHeight: 1,
            color: "#ffffff",
            letterSpacing: "-0.01em",
            opacity: frase,
            scale: String(mezclar(2.2, 1, frase) + 0.03 * tramo(t, GOLPE_FRASE + 3, 60)),
            filter: `blur(${(1 - frase) * 16}px)`,
            textShadow: `${sepFrase}px 0 0 rgba(226,27,77,0.85), ${-sepFrase}px 0 0 rgba(60,200,255,0.75), 0 10px 50px rgba(0,0,0,0.55)`,
            whiteSpace: "nowrap",
          }}
        >
          RED BULL TE DA <span style={{ color: COLORES.amarillo }}>AAALAS</span>
        </div>
      </AbsoluteFill>
      <Flash fuerza={Math.max(1 - tramo(t, 0, 8), impacto * 0.7, t >= GOLPE_FRASE ? 0.5 * Math.exp(-(t - GOLPE_FRASE) / 3) : 0)} />
    </AbsoluteFill>
  );
};
