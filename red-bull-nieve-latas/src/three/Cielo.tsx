import React, { useMemo } from "react";
import * as THREE from "three";

// Cielo con degradé (cenit → horizonte → suelo) y resplandor alrededor del sol.
// La esfera se dibuja siempre centrada en la cámara, así parece infinitamente lejos.
export const Cielo: React.FC<{
  readonly arriba: string;
  readonly horizonte: string;
  readonly abajo?: string;
  readonly solDir?: [number, number, number];
  readonly solColor?: string;
  readonly halo?: number;
  // Qué tan rápido pasa del horizonte al azul de arriba (menor = más azul cerca del horizonte).
  readonly curva?: number;
}> = ({ arriba, horizonte, abajo = horizonte, solDir = [0, 0.2, -1], solColor = "#ffe9a8", halo = 1, curva = 0.55 }) => {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uArriba: { value: new THREE.Color() },
          uHorizonte: { value: new THREE.Color() },
          uAbajo: { value: new THREE.Color() },
          uSolDir: { value: new THREE.Vector3() },
          uSolColor: { value: new THREE.Color() },
          uHalo: { value: 1 },
          uCurva: { value: 0.55 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            vec4 p = viewMatrix * vec4(position + cameraPosition, 1.0);
            gl_Position = projectionMatrix * p;
            gl_Position.z = gl_Position.w * 0.99999;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uArriba;
          uniform vec3 uHorizonte;
          uniform vec3 uAbajo;
          uniform vec3 uSolDir;
          uniform vec3 uSolColor;
          uniform float uHalo;
          uniform float uCurva;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 c = h > 0.0
              ? mix(uHorizonte, uArriba, pow(clamp(h, 0.0, 1.0), uCurva))
              : mix(uHorizonte, uAbajo, pow(clamp(-h, 0.0, 1.0), 0.35));
            float s = max(dot(d, normalize(uSolDir)), 0.0);
            c += uSolColor * (pow(s, 6.0) * 0.28 + pow(s, 48.0) * 0.55) * uHalo;
            gl_FragColor = vec4(c, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  );
  material.uniforms.uArriba.value.set(arriba);
  material.uniforms.uHorizonte.value.set(horizonte);
  material.uniforms.uAbajo.value.set(abajo);
  material.uniforms.uSolDir.value.set(...solDir);
  material.uniforms.uSolColor.value.set(solColor);
  material.uniforms.uHalo.value = halo;
  material.uniforms.uCurva.value = curva;
  return (
    <mesh material={material} frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[1000, 48, 24]} />
    </mesh>
  );
};

const texturaSol = (() => {
  let cache: THREE.CanvasTexture | null = null;
  return () => {
    if (cache) return cache;
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    g.addColorStop(0, "rgba(255,226,90,1)");
    g.addColorStop(0.27, "rgba(255,214,40,1)");
    g.addColorStop(0.285, "rgba(255,206,40,0.55)");
    g.addColorStop(0.4, "rgba(255,190,60,0.22)");
    g.addColorStop(0.65, "rgba(255,170,70,0.07)");
    g.addColorStop(1, "rgba(255,160,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    cache = new THREE.CanvasTexture(c);
    cache.colorSpace = THREE.SRGBColorSpace;
    return cache;
  };
})();

// El sol de Red Bull: disco amarillo con halo. Es un sprite (siempre mira a cámara).
export const SolRedBull: React.FC<{
  readonly posicion: [number, number, number];
  readonly tam: number;
  readonly intensidad?: number;
}> = ({ posicion, tam, intensidad = 1 }) => {
  const mapa = useMemo(() => texturaSol(), []);
  return (
    <sprite position={posicion} scale={[tam, tam, 1]} renderOrder={-5}>
      <spriteMaterial
        map={mapa}
        transparent
        depthWrite={false}
        fog={false}
        toneMapped={false}
        color={new THREE.Color(1.15 * intensidad, 1.08 * intensidad, 1 * intensidad)}
      />
    </sprite>
  );
};
