import React, { useMemo } from "react";
import { random } from "remotion";
import * as THREE from "three";

// Copos de nieve que caen dentro de una caja y se repiten sin cortes.
// Todo el movimiento sale de uTiempo (el número de cuadro), así el render es exacto.
export const NieveCayendo: React.FC<{
  readonly cantidad: number;
  readonly centro: [number, number, number];
  readonly caja: [number, number, number];
  readonly tiempo: number;
  readonly caida?: number;
  readonly viento?: [number, number];
  readonly tam?: number;
  readonly color?: string;
  readonly opacidad?: number;
  readonly semilla?: string;
}> = ({
  cantidad,
  centro,
  caja,
  tiempo,
  caida = 0.05,
  viento = [0.01, 0],
  tam = 1,
  color = "#ffffff",
  opacidad = 1,
  semilla = "nieve",
}) => {
  const { geo, mat } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const base = new Float32Array(cantidad * 3);
    const extra = new Float32Array(cantidad * 2);
    for (let i = 0; i < cantidad; i++) {
      base[i * 3] = random(`${semilla}x${i}`);
      base[i * 3 + 1] = random(`${semilla}y${i}`);
      base[i * 3 + 2] = random(`${semilla}z${i}`);
      extra[i * 2] = 0.5 + random(`${semilla}s${i}`);
      extra[i * 2 + 1] = random(`${semilla}f${i}`) * 6.28;
    }
    g.setAttribute("position", new THREE.BufferAttribute(base, 3));
    g.setAttribute("extra", new THREE.BufferAttribute(extra, 2));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTiempo: { value: 0 },
        uCentro: { value: new THREE.Vector3() },
        uCaja: { value: new THREE.Vector3() },
        uCaida: { value: 0 },
        uViento: { value: new THREE.Vector2() },
        uTam: { value: 1 },
        uColor: { value: new THREE.Color() },
        uOpacidad: { value: 1 },
        uAltoPantalla: { value: 1080 },
      },
      vertexShader: /* glsl */ `
        attribute vec2 extra;
        uniform float uTiempo;
        uniform vec3 uCentro;
        uniform vec3 uCaja;
        uniform float uCaida;
        uniform vec2 uViento;
        uniform float uTam;
        uniform float uAltoPantalla;
        varying float vAlpha;
        void main() {
          float t = uTiempo;
          vec3 p = position * uCaja;
          p.y -= t * uCaida * extra.x;
          p.x += t * uViento.x + sin(t * 0.07 * extra.x + extra.y) * 0.6;
          p.z += t * uViento.y + cos(t * 0.05 * extra.x + extra.y) * 0.6;
          p = mod(p, uCaja) - uCaja * 0.5 + uCentro;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float tam = uTam * extra.x * 0.04 * uAltoPantalla / max(0.1, -mv.z);
          gl_PointSize = clamp(tam, 1.0, 90.0);
          vAlpha = smoothstep(0.0, 2.0, -mv.z) * clamp(tam / 2.0, 0.25, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacidad;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = smoothstep(0.5, 0.15, d);
          gl_FragColor = vec4(uColor, a * vAlpha * uOpacidad);
        }
      `,
    });
    return { geo: g, mat: m };
  }, [cantidad, semilla]);
  mat.uniforms.uTiempo.value = tiempo;
  mat.uniforms.uCentro.value.set(...centro);
  mat.uniforms.uCaja.value.set(...caja);
  mat.uniforms.uCaida.value = caida;
  mat.uniforms.uViento.value.set(...viento);
  mat.uniforms.uTam.value = tam;
  mat.uniforms.uColor.value.set(color);
  mat.uniforms.uOpacidad.value = opacidad;
  return <points geometry={geo} material={mat} frustumCulled={false} />;
};

// Estallido de partículas (polvo de nieve, chispas de color, astillas de hielo).
// Cada partícula sale de "origen" con una velocidad propia y la gravedad la frena.
export const Estallido: React.FC<{
  readonly cantidad: number;
  readonly origen: [number, number, number];
  // Edad del estallido en segundos (antes de 0 no se ve).
  readonly edad: number;
  readonly direccion?: [number, number, number];
  readonly apertura?: number;
  readonly velocidad?: number;
  readonly gravedad?: number;
  readonly arrastre?: number;
  readonly vida?: number;
  readonly tam?: number;
  readonly color?: string;
  readonly color2?: string;
  readonly aditivo?: boolean;
  readonly semilla?: string;
  readonly emision?: number;
}> = ({
  cantidad,
  origen,
  edad,
  direccion = [0, 1, 0],
  apertura = 1,
  velocidad = 4,
  gravedad = 3,
  arrastre = 1.2,
  vida = 1.6,
  tam = 1,
  color = "#ffffff",
  color2,
  aditivo = false,
  semilla = "estallido",
  emision = 0,
}) => {
  const { geo, mat } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const dir = new Float32Array(cantidad * 3);
    const extra = new Float32Array(cantidad * 3);
    for (let i = 0; i < cantidad; i++) {
      // Dirección aleatoria en una esfera.
      const u = random(`${semilla}u${i}`) * 2 - 1;
      const a = random(`${semilla}a${i}`) * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      dir[i * 3] = r * Math.cos(a);
      dir[i * 3 + 1] = u;
      dir[i * 3 + 2] = r * Math.sin(a);
      extra[i * 3] = 0.25 + random(`${semilla}v${i}`) * 0.75;
      extra[i * 3 + 1] = 0.4 + random(`${semilla}s${i}`) * 1.2;
      extra[i * 3 + 2] = random(`${semilla}t${i}`);
    }
    g.setAttribute("position", new THREE.BufferAttribute(dir, 3));
    g.setAttribute("extra", new THREE.BufferAttribute(extra, 3));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uEdad: { value: 0 },
        uOrigen: { value: new THREE.Vector3() },
        uDir: { value: new THREE.Vector3() },
        uApertura: { value: 1 },
        uVel: { value: 1 },
        uGrav: { value: 1 },
        uArrastre: { value: 1 },
        uVida: { value: 1 },
        uTam: { value: 1 },
        uColor: { value: new THREE.Color() },
        uColor2: { value: new THREE.Color() },
        uEmision: { value: 0 },
        uAltoPantalla: { value: 1080 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 extra;
        uniform float uEdad;
        uniform vec3 uOrigen;
        uniform vec3 uDir;
        uniform float uApertura;
        uniform float uVel;
        uniform float uGrav;
        uniform float uArrastre;
        uniform float uVida;
        uniform float uTam;
        uniform float uEmision;
        uniform float uAltoPantalla;
        varying float vAlpha;
        varying float vMezcla;
        void main() {
          // Con "emisión", cada partícula nace un poco después (chorro continuo).
          float nace = extra.z * uEmision;
          float t = uEdad - nace;
          vec3 d = normalize(mix(normalize(uDir), position, uApertura) + 1e-4);
          float v = uVel * extra.x;
          // Velocidad que decae por el aire (arrastre) + gravedad.
          float k = (1.0 - exp(-uArrastre * max(t, 0.0))) / uArrastre;
          vec3 p = uOrigen + d * v * k;
          p.y -= 0.5 * uGrav * max(t, 0.0) * max(t, 0.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float vidaN = clamp(t / (uVida * (0.6 + 0.4 * extra.y)), 0.0, 1.0);
          float tam = uTam * extra.y * 0.05 * uAltoPantalla / max(0.1, -mv.z) * (0.6 + vidaN * 0.9);
          gl_PointSize = clamp(tam, 1.0, 140.0);
          vAlpha = (t < 0.0 ? 0.0 : 1.0) * (1.0 - vidaN) * smoothstep(0.0, 0.04, t);
          vMezcla = extra.z;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform vec3 uColor2;
        varying float vAlpha;
        varying float vMezcla;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d);
          gl_FragColor = vec4(mix(uColor, uColor2, vMezcla), a * vAlpha);
        }
      `,
    });
    return { geo: g, mat: m };
  }, [cantidad, semilla, aditivo]);
  mat.uniforms.uEdad.value = edad;
  mat.uniforms.uOrigen.value.set(...origen);
  mat.uniforms.uDir.value.set(...direccion);
  mat.uniforms.uApertura.value = apertura;
  mat.uniforms.uVel.value = velocidad;
  mat.uniforms.uGrav.value = gravedad;
  mat.uniforms.uArrastre.value = arrastre;
  mat.uniforms.uVida.value = vida;
  mat.uniforms.uTam.value = tam;
  mat.uniforms.uColor.value.set(color);
  mat.uniforms.uColor2.value.set(color2 ?? color);
  mat.uniforms.uEmision.value = emision;
  if (edad < 0) return null;
  return <points geometry={geo} material={mat} frustumCulled={false} />;
};
