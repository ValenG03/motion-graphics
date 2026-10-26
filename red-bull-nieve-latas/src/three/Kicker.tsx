import React, { useMemo } from "react";
import * as THREE from "three";

// Rampa de nieve (kicker) moldeada: perfil curvo que termina en un labio,
// con los costados en pendiente. "suelo(x)" la apoya sobre la pista.
export const Kicker: React.FC<{
  readonly largo: number;
  readonly alto: number;
  readonly ancho: number;
  readonly curva?: number;
  readonly suelo: (x: number) => number;
  readonly color?: string;
}> = ({ largo, alto, ancho, curva = 2.2, suelo, color = "#f2f6ff" }) => {
  const geo = useMemo(() => {
    const perfil = (x: number) => alto * Math.pow((x + largo) / largo, curva);
    const forma = new THREE.Shape();
    forma.moveTo(-largo - 0.5, -0.6);
    for (let i = 0; i <= 30; i++) {
      const x = -largo + (largo * i) / 30;
      forma.lineTo(x, perfil(x));
    }
    forma.lineTo(0.25, alto - 0.15);
    forma.lineTo(0.9, -0.6);
    forma.lineTo(-largo - 0.5, -0.6);
    const g = new THREE.ExtrudeGeometry(forma, {
      depth: ancho,
      bevelEnabled: true,
      bevelSize: 0.25,
      bevelThickness: 0.4,
      bevelSegments: 4,
      curveSegments: 4,
    });
    g.translate(0, 0, -ancho / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const abajo = 1 - THREE.MathUtils.clamp((y + 0.6) / (alto + 0.6), 0, 1);
      pos.setZ(i, pos.getZ(i) * (1 + abajo * 0.9));
      pos.setY(i, y + suelo(pos.getX(i)));
    }
    g.computeVertexNormals();
    return g;
  }, [largo, alto, ancho, curva, suelo]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
};

export const alturaKicker = (x: number, largo: number, alto: number, curva = 2.2) =>
  x < -largo || x > 0 ? 0 : alto * Math.pow((x + largo) / largo, curva);
