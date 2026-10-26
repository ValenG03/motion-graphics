import React, { useMemo } from "react";
import { AbsoluteFill, random } from "remotion";
import * as THREE from "three";
import { COLORES } from "../marca";
import { Atleta, POSES, V3 } from "../three/Atleta";
import { Camara, PlanoCamara, proyectar, temblor } from "../three/Camara";
import { Cielo, SolRedBull } from "../three/Cielo";
import { Entorno } from "../three/Entorno";
import { Escena3D } from "../three/Escena3D";
import { NieveCayendo } from "../three/Particulas";
import { crestas, fbm } from "../three/ruido";
import { Terreno } from "../three/Terreno";
import { mezclar, rampa, Rampa, suave, tramo, useT } from "../tiempo";
import { Destello, Flash, NieveFrente, Rotulo, Vineta } from "../ui/Efectos";

// TOMA 7 (12–14 s) · NIEVE · Natural Selection (Revelstoke)
// Backcountry: el rider tira un giro enorme en nieve polvo y levanta una estela
// que brilla a contraluz. Un dron lo sigue desde arriba.

const RAMPA: Rampa = [
  [0, 1.2],
  [14, 1.1],
  [22, 0.5],
  [42, 0.5],
  [52, 1.4],
  [60, 1.6],
];

const PENDIENTE = 0.68;
const VEL = 13; // m/s ladera abajo

const softplus = (x: number, k: number) => Math.log(1 + Math.exp(x * k)) / k;
const alturaCon = (x: number, z: number, octavas: number) => {
  const base = -PENDIENTE * x + 0.25 * softplus(x - 60, 0.05) * 0 + fbm(x * 0.03, z * 0.03, 4) * 3;
  // Espinas y almohadas de nieve a los costados de la línea.
  const zz = z + fbm(x * 0.03, z * 0.03, 2) * 14;
  const espinas = crestas(x * 0.03 + 7, zz * 0.05, 3) * 3.2 * THREE.MathUtils.smoothstep(Math.abs(z), 14, 40);
  const r = Math.sqrt((x - 40) ** 2 + z * z);
  const picos = THREE.MathUtils.smoothstep(r, 320, 800) * crestas(x * 0.0022 + 9, z * 0.0022, octavas) * 380;
  return base + espinas + picos;
};
const altura = (x: number, z: number) => alturaCon(x, z, 6);
const alturaLejos = (x: number, z: number) => {
  const dentro =
    (1 - THREE.MathUtils.smoothstep(Math.abs(x - 30), 134, 140)) * (1 - THREE.MathUtils.smoothstep(Math.abs(z), 114, 120));
  return alturaCon(x, z, 3) - dentro * 9;
};

// Recorrido: un gran giro en S ladera abajo.
const recorrido = (s: number) => {
  const x = -10 + VEL * s;
  const z = 9 * Math.sin(s * 1.7 - 0.6);
  const dz = 9 * 1.7 * Math.cos(s * 1.7 - 0.6);
  const ddz = -9 * 1.7 * 1.7 * Math.sin(s * 1.7 - 0.6);
  return { x, z, y: altura(x, z) - 0.18, rumbo: Math.atan2(dz, VEL), lateral: ddz };
};

// Estela de nieve polvo: cada copo nace donde pasó la tabla y sale despedido hacia afuera de la curva.
const EstelaPolvo: React.FC<{ readonly s: number; readonly fin: number }> = ({ s, fin }) => {
  const { geo, mat } = useMemo(() => {
    const n = 14000;
    const origen = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    const extra = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const nace = random(`pn${i}`) * fin;
      const p = recorrido(nace);
      origen[i * 3] = p.x;
      origen[i * 3 + 1] = p.y + 0.1;
      origen[i * 3 + 2] = p.z;
      // Hacia afuera de la curva (opuesto a la aceleración lateral) y hacia arriba.
      const afuera = -Math.sign(p.lateral || 1);
      const fuerza = 0.4 + Math.min(1, Math.abs(p.lateral) / 20);
      vel[i * 3] = -3 + (random(`pvx${i}`) - 0.5) * 4;
      vel[i * 3 + 1] = (3.5 + random(`pvy${i}`) * 8) * fuerza;
      vel[i * 3 + 2] = afuera * (3 + random(`pvz${i}`) * 9) * fuerza + (random(`pvw${i}`) - 0.5) * 3;
      extra[i * 2] = nace;
      extra[i * 2 + 1] = 0.5 + random(`ps${i}`);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(origen, 3));
    g.setAttribute("vel", new THREE.BufferAttribute(vel, 3));
    g.setAttribute("extra", new THREE.BufferAttribute(extra, 2));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uS: { value: 0 }, uAlto: { value: 1080 }, uSol: { value: new THREE.Vector3(0, 0, -1) } },
      vertexShader: /* glsl */ `
        attribute vec3 vel;
        attribute vec2 extra;
        uniform float uS;
        uniform float uAlto;
        varying float vA;
        varying float vLuz;
        void main() {
          float edad = uS - extra.x;
          float e = max(edad, 0.0);
          // El polvo frena rápido en el aire y cae despacio.
          float k = (1.0 - exp(-2.2 * e)) / 2.2;
          vec3 p = position + vel * k;
          p.y -= 0.9 * e * e;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float tam = extra.y * (0.7 + e * 3.2);
          gl_PointSize = clamp(tam * 0.16 * uAlto / max(0.1, -mv.z), 1.0, 220.0);
          vA = (edad < 0.0 ? 0.0 : 1.0) * smoothstep(0.0, 0.04, e) * (1.0 - smoothstep(0.9, 2.4, e)) * 0.22;
          vLuz = extra.y;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vA;
        varying float vLuz;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          // Contraluz: el polvo se enciende dorado.
          vec3 c = mix(vec3(0.96, 0.97, 1.0), vec3(1.0, 0.9, 0.72), 0.25 + 0.3 * vLuz);
          gl_FragColor = vec4(c, a * vA);
        }
      `,
    });
    return { geo: g, mat: m };
  }, [fin]);
  mat.uniforms.uS.value = s;
  return <points geometry={geo} material={mat} frustumCulled={false} />;
};

const Pinos: React.FC = () => {
  const pinos = useMemo(
    () =>
      new Array(220).fill(0).map((_, i) => {
        const r = (k: string) => random(`pino${k}${i}`);
        const x = -20 + r("x") * 120;
        // Lejos del camino del dron (que vuela del lado +z).
        const lado = r("l") > 0.3 ? -1 : 1;
        const z = lado < 0 ? -(16 + r("z") * 70) : 42 + r("z") * 40;
        const esc = 0.7 + r("e") * 1.1;
        return { x, z, y: altura(x, z), esc };
      }),
    [],
  );
  return (
    <>
      {pinos.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]} scale={p.esc}>
          <mesh position={[0, 3.2, 0]}>
            <coneGeometry args={[1.5, 6.5, 7]} />
            <meshStandardMaterial color="#173326" roughness={0.9} />
          </mesh>
          <mesh position={[0, 5.2, 0]}>
            <coneGeometry args={[0.9, 3.2, 7]} />
            <meshStandardMaterial color="#e8eef8" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </>
  );
};

const SOL_DIR = new THREE.Vector3(0.35, 0.22, -1).normalize();

const planoEn = (t: number, r: V3): PlanoCamara => {
  // Dron: arriba, atrás y al costado; baja y gira un poco mientras acompaña.
  const k = suave(tramo(t, 0, 60));
  const ang = mezclar(0.9, 0.35, k);
  const dist = mezclar(17, 11, k);
  const alto = mezclar(16, 10, k);
  const pos: V3 = [r[0] - Math.cos(ang) * dist, r[1] + alto, r[2] + Math.sin(ang) * dist];
  // El dron nunca baja de 2,5 m sobre la nieve (la ladera sube detrás del rider).
  pos[1] = Math.max(pos[1], altura(pos[0], pos[2]) + 2.5);
  const sac = temblor(t * 0.7, 0.05);
  return {
    pos: [pos[0] + sac[0], pos[1] + sac[1], pos[2]],
    mirar: [r[0] + 4, r[1] - 1, r[2] - 1],
    fov: mezclar(46, 38, k),
    giro: mezclar(0.12, 0.02, k),
  };
};

// "sinTextos": para reutilizar la toma dentro del montaje rápido (toma 9).
export const Toma07NaturalSelection: React.FC<{ readonly sinTextos?: boolean }> = ({ sinTextos = false }) => {
  const t = useT();
  const ta = rampa(t, RAMPA);
  const s = ta / 30;
  const p = recorrido(s);
  const plano = planoEn(t, [p.x, p.y, p.z]);
  const solPos: V3 = [p.x + SOL_DIR.x * 900, p.y + SOL_DIR.y * 900, p.z + SOL_DIR.z * 900];
  const sol = proyectar(plano, solPos, 1920, 1080);
  const ladeo = THREE.MathUtils.clamp(p.lateral * 0.035, -0.75, 0.75);
  const finEstela = rampa(60, RAMPA) / 30;

  return (
    <AbsoluteFill style={{ backgroundColor: "#3a5aa0" }}>
      <Escena3D filtro="contrast(1.12) saturate(1.15)">
        <Camara {...plano} />
        <Entorno tipo="nieve" intensidad={0.4} />
        <fog attach="fog" args={["#b8c8e8", 260, 2600]} />
        <Cielo arriba="#1640a8" horizonte="#f3c995" abajo="#dfe6f2" solDir={[SOL_DIR.x, SOL_DIR.y, SOL_DIR.z]} solColor="#ffd08a" halo={0.8} />
        <SolRedBull posicion={solPos} tam={70} />
        <hemisphereLight args={["#9fb8ff", "#5b6688", 0.55]} />
        <directionalLight position={[SOL_DIR.x * 10, SOL_DIR.y * 10, SOL_DIR.z * 10]} intensity={2.8} color="#ffcf94" />
        <Terreno ancho={280} largo={240} segX={340} segZ={290} centro={[30, 0]} altura={altura} umbralRoca={0.45} colorNieve="#f1f4fb" colorSombra="#b9c9e8" grano={0.07} />
        <Terreno ancho={1600} largo={1600} segX={240} segZ={240} altura={alturaLejos} umbralRoca={0.42} colorNieve="#eef2fa" colorSombra="#b6c6e6" colorRoca="#3b3f4c" />
        <Pinos />
        <group position={[p.x, p.y, p.z]} rotation={[0, -p.rumbo, 0]}>
          {/* La tabla va a lo largo de la dirección de bajada; el cuerpo se inclina hacia adentro del giro */}
          <group rotation={[ladeo, 0, Math.atan(-PENDIENTE) * 0.85]}>
            <Atleta tipo="snowboard" pose={POSES.snowCarve} colorCampera={COLORES.amarillo} />
          </group>
        </group>
        <EstelaPolvo s={s} fin={finEstela} />
        <NieveCayendo cantidad={900} centro={[p.x, p.y + 3, p.z]} caja={[30, 14, 30]} tiempo={ta} caida={0.03} viento={[0.04, 0.01]} tam={0.6} opacidad={0.7} />
      </Escena3D>
      <Destello x={sol.x} y={sol.y} fuerza={sol.delante ? 0.6 : 0} color="255,200,130" />
      <NieveFrente t={ta} cantidad={14} velocidad={[-6, 3]} opacidad={0.5} semilla="t7" color="255,240,220" />
      <Vineta fuerza={0.4} />
      {sinTextos ? null : <Rotulo nombre="NATURAL SELECTION" lugar="REVELSTOKE · CANADÁ" t={t - 10} x={110} y={790} tam={118} salida={t - 52} />}
      {sinTextos ? null : <Flash fuerza={Math.max(0.45 * (1 - tramo(t, 0, 4)), tramo(t, 57, 60) * 0.5)} />}
    </AbsoluteFill>
  );
};
