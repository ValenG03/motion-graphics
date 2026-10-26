import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { useVideoConfig } from "remotion";

// Lienzo 3D a pantalla completa con el "look" de color común a todas las tomas.
export const Escena3D: React.FC<{
  readonly children: React.ReactNode;
  readonly filtro?: string;
}> = ({ children, filtro = "contrast(1.08) saturate(1.12)" }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      gl={{ antialias: true }}
      style={{ filter: filtro }}
      camera={{ fov: 45, near: 0.05, far: 4000, position: [0, 0, 10] }}
    >
      {children}
    </ThreeCanvas>
  );
};
