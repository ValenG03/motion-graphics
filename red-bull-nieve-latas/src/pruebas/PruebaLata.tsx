import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { VarianteLata } from "../marca";
import { Entorno } from "../three/Entorno";
import { Lata } from "../three/Lata";
import { useT } from "../tiempo";
import { ConFuentes } from "../ui/ConFuentes";
import { LogoRedBull } from "../ui/LogoRedBull";

const VARIANTES: VarianteLata[] = ["clasica", "sugarfree", "zero", "red", "green", "pomelo", "winter"];

const Latas: React.FC = () => {
  const t = useT();
  return (
    <>
      {VARIANTES.map((v, i) => (
        <group key={v} position={[(i - 3) * 1.45, 0, 0]} rotation={[0, t * 0.03 + (v === "clasica" ? 0 : 0), 0]}>
          <Lata variante={v} condensacion={i === 0 ? 1 : 0} escarcha={i === 6 ? 1 : 0} />
        </group>
      ))}
    </>
  );
};

export const PruebaLata: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a1430" }}>
      <ConFuentes>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0.6, 9], fov: 40 }}>
        <Entorno tipo="estudio" />
        <ambientLight intensity={0.2} />
        <directionalLight position={[3, 5, 6]} intensity={1.5} />
        <Latas />
      </ThreeCanvas>
      </ConFuentes>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 30 }}>
        <div style={{ background: "#ffffff", padding: 16, borderRadius: 12 }}>
          <LogoRedBull ancho={360} brilloSol={0.3} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
