import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { Atleta, Pose, POSES, poseEn, V3 } from "../three/Atleta";
import { Camara, PlanoCamara, proyectar, recorrido, temblor } from "../three/Camara";
import { Cielo, SolRedBull } from "../three/Cielo";
import { Entorno } from "../three/Entorno";
import { Escena3D } from "../three/Escena3D";
import { Estallido, NieveCayendo } from "../three/Particulas";
import { crestas, fbm } from "../three/ruido";
import { Terreno } from "../three/Terreno";
import { mezclar, rampa, Rampa, suave, tramo, useT } from "../tiempo";
import { Destello, ExplosionNieve, Flash, NieveFrente, RayasVelocidad, TituloImpacto, Vineta } from "../ui/Efectos";

// TOMA 1 (0–2 s) · NIEVE
// Picada sobre la montaña → el rider salta frente al sol de Red Bull en cámara lenta →
// "RED BULL TE DA ALAS" golpea → aceleración y la nieve del aterrizaje tapa la lente.

const RAMPA: Rampa = [
  [0, 1.1],
  [9, 1.1],
  [15, 0.3],
  [40, 0.3],
  [46, 5.2],
  [60, 5.2],
];

const VX = 11; // velocidad horizontal (m/s)
const VY = 3.6; // impulso vertical al salir del kicker
const ALTO_LABIO = 1.6;
const POP = 8.6 / 30; // segundo de acción en que deja el kicker

// Forma del terreno: pendiente que se empina después del salto, valle y montañas lejanas.
const softplus = (x: number, k: number) => Math.log(1 + Math.exp(x * k)) / k;
const alturaCon = (x: number, z: number, octavas: number) => {
  // Pendiente principal: se empina después del salto y se aplana arriba (collado detrás del sol).
  const base = -0.3 * x - 0.28 * softplus(x - 6, 0.6) - 0.24 * softplus(-(x + 70), 0.08);
  const r = Math.sqrt(x * x + z * z);
  // Las montañas bajan en la dirección del sol para dejar el cielo abierto.
  const abertura = THREE.MathUtils.smoothstep(Math.abs(Math.atan2(z, -x)), 0.45, 1.2);
  const montes =
    THREE.MathUtils.smoothstep(r, 170, 560) *
    crestas(x * 0.003 + 3.1, z * 0.003 - 1.7, octavas) *
    330 *
    (0.25 + 0.75 * abertura);
  // Valle suave (limitado) y lomas a los costados de la pista, que queda pisada en el medio.
  const valle = 9 * (1 - Math.exp(-(z * z) / 900));
  const lomas = fbm(x * 0.022 + 4.1, z * 0.03, 4) * 2.6 * THREE.MathUtils.smoothstep(Math.abs(z), 4, 16);
  return base + valle + lomas + fbm(x * 0.045, z * 0.045, 4) * 0.5 + montes;
};
const altura = (x: number, z: number) => alturaCon(x, z, 6);
const suelo = (x: number) => altura(x, 0);
// La malla lejana (gruesa) se hunde un poco donde está la malla fina, para no asomar.
const alturaLejos = (x: number, z: number) => {
  const dentro =
    (1 - THREE.MathUtils.smoothstep(Math.abs(x - 8), 70, 76)) * (1 - THREE.MathUtils.smoothstep(Math.abs(z), 30, 36));
  // Menos octavas lejos: evita rayas por detalle más fino que la malla.
  return alturaCon(x, z, 4) - dentro * 1.2;
};

// Altura extra del kicker (rampa de nieve) entre x = -7 y el labio en x = 0.
const kicker = (x: number) => (x < -7 || x > 0 ? 0 : ALTO_LABIO * Math.pow((x + 7) / 7, 2.2));

const Y_LABIO = suelo(0) + ALTO_LABIO;

// Busca el momento en que el rider toca la pista de aterrizaje.
const T_ATERRIZA = (() => {
  for (let s = 0.2; s < 4; s += 0.002) {
    const y = Y_LABIO + VY * s - 4.9 * s * s;
    if (y <= suelo(VX * s) + 0.05) return s;
  }
  return 2;
})();
const X_ATERRIZA = VX * T_ATERRIZA;

const estadoRider = (ta: number) => {
  const s = ta - POP;
  if (s < 0) {
    const x = VX * s;
    const y = suelo(x) + kicker(x);
    const dx = 0.05;
    const pend = (suelo(x + dx) + kicker(x + dx) - y) / dx;
    return { x, y, z: 0, pendiente: Math.atan(pend), enAire: false };
  }
  if (s < T_ATERRIZA) {
    const x = VX * s;
    const y = Y_LABIO + VY * s - 4.9 * s * s;
    return { x, y, z: 0, pendiente: Math.atan((VY - 9.8 * s) / VX) * 0.45 - 0.12, enAire: true };
  }
  // Después de aterrizar dobla (carve) alejándose de la cámara.
  const d = s - T_ATERRIZA;
  const x = X_ATERRIZA + VX * 0.7 * d;
  const z = -6 * d * d - 2.5 * d;
  const y = altura(x, z);
  const pend = (suelo(x + 0.05) - suelo(x)) / 0.05;
  return { x, y, z, pendiente: Math.atan(pend), enAire: false };
};

const APICE: V3 = [VX * (VY / 9.8), Y_LABIO + (VY * VY) / 19.6, 0];
// Cámara baja con teleobjetivo, pasando el aterrizaje: mira cuesta arriba hacia el salto, contra el sol.
const CAM_BAJA: V3 = [X_ATERRIZA + 6.5, suelo(X_ATERRIZA + 6.5) + 0.6, 3];
// El sol se ubica detrás del ápice, visto desde la cámara baja.
const SOL_POS: V3 = (() => {
  const d = new THREE.Vector3(...APICE).sub(new THREE.Vector3(...CAM_BAJA)).normalize();
  d.y += 0.012;
  d.normalize();
  const p = new THREE.Vector3(...APICE).add(d.multiplyScalar(900));
  return [p.x, p.y, p.z];
})();

const posesClave = (): (readonly [number, Pose])[] => {
  const p = POP * 30;
  const l = (POP + T_ATERRIZA) * 30;
  return [
    [p - 9, POSES.snowBajada],
    [p - 3, POSES.snowCompresion],
    [p + 1, POSES.snowPop],
    [p + 7, POSES.snowMethod],
    [l - 7, POSES.snowMethod],
    [l - 1, POSES.snowAterrizaje],
    [l + 4, POSES.snowCompresion],
  ];
};

const Kicker: React.FC = () => {
  const geo = useMemo(() => {
    const forma = new THREE.Shape();
    forma.moveTo(-7.5, -0.6);
    for (let i = 0; i <= 30; i++) {
      const x = -7 + (7 * i) / 30;
      forma.lineTo(x, kicker(x));
    }
    forma.lineTo(0.25, ALTO_LABIO - 0.15);
    forma.lineTo(0.9, -0.6);
    forma.lineTo(-7.5, -0.6);
    const g = new THREE.ExtrudeGeometry(forma, {
      depth: 5,
      bevelEnabled: true,
      bevelSize: 0.25,
      bevelThickness: 0.4,
      bevelSegments: 4,
      curveSegments: 4,
    });
    g.translate(0, 0, -2.5);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      // Costados en pendiente (más ancho abajo), como una rampa de nieve moldeada.
      const y = pos.getY(i);
      const abajo = 1 - THREE.MathUtils.clamp((y + 0.6) / (ALTO_LABIO + 0.6), 0, 1);
      pos.setZ(i, pos.getZ(i) * (1 + abajo * 0.9));
      pos.setY(i, y + suelo(pos.getX(i)));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#f2f6ff" roughness={0.9} />
    </mesh>
  );
};

const planoEn = (t: number, rider: V3): PlanoCamara => {
  // 0–16: picada desde lo alto de la montaña hasta la cámara baja junto al aterrizaje.
  const kDive = suave(tramo(t, 0, 16));
  const pos = recorrido(
    [
      [-70, 50, 34],
      [-20, 30, 26],
      [16, 8, 10],
      CAM_BAJA,
    ],
    kDive,
  );
  // Durante la cámara lenta, un dolly lateral muy lento.
  const deriva = suave(tramo(t, 16, 60));
  pos[2] -= deriva * 1.4;
  pos[1] -= deriva * 0.2;
  const sacudon = t > 51 ? temblor(t * 3, 0.06) : temblor(t, 0.008);
  const mirarInicio: V3 = [0, 8, 0];
  const kMirar = suave(tramo(t, 2, 14));
  const mirar: V3 = [
    mezclar(mirarInicio[0], rider[0], kMirar) + sacudon[0],
    mezclar(mirarInicio[1], rider[1] + 0.6, kMirar) + sacudon[1],
    mezclar(mirarInicio[2], rider[2], kMirar),
  ];
  return { pos, mirar, fov: mezclar(60, 24, kDive), giro: mezclar(-0.45, 0.03, kDive) };
};

export const Toma01Salto: React.FC = () => {
  const t = useT();
  const ta = rampa(t, RAMPA) / 30;
  const r = estadoRider(ta);
  const pose = poseEn(posesClave(), ta * 30);
  const plano = planoEn(t, [r.x, r.y, r.z]);
  const sol = proyectar(plano, SOL_POS, 1920, 1080);
  const puntoAterrizaje = proyectar(plano, [r.x, r.y + 0.4, r.z], 1920, 1080);
  const edadAterrizaje = ta - POP - T_ATERRIZA;
  const tAterrizaPantalla = (() => {
    for (let f = 0; f <= 60; f += 0.25) if (rampa(f, RAMPA) / 30 >= POP + T_ATERRIZA) return f;
    return 60;
  })();
  const blanco = Math.pow(tramo(t, tAterrizaPantalla + 1, 59), 1.6);

  return (
    <AbsoluteFill style={{ backgroundColor: "#9cc3f0" }}>
      <Escena3D filtro="contrast(1.1) saturate(1.15)">
        <Camara {...plano} />
        <Entorno tipo="nieve" intensidad={0.45} />
        <fog attach="fog" args={["#c6dcf6", 220, 2600]} />
        <Cielo arriba="#0a3cae" horizonte="#9cc8f4" abajo="#dfe9f6" solDir={SOL_POS} solColor="#fff6c8" halo={0.4} />
        <SolRedBull posicion={SOL_POS} tam={270} intensidad={1.05} />
        <hemisphereLight args={["#bcd4ff", "#8d9cbc", 0.55]} />
        <directionalLight position={[SOL_POS[0] * 0.01, SOL_POS[1] * 0.01, SOL_POS[2] * 0.01]} intensity={2.6} color="#ffe9c8" />
        <directionalLight position={[20, 10, 30]} intensity={0.3} color="#cfe0ff" />
        <Terreno ancho={150} largo={70} segX={300} segZ={140} centro={[8, 0]} altura={altura} umbralRoca={0.6} colorNieve="#eef3fb" colorSombra="#c4d4ee" grano={0.06} />
        <Terreno ancho={1400} largo={1400} segX={240} segZ={240} altura={alturaLejos} umbralRoca={0.42} colorNieve="#eef3fb" colorSombra="#c4d4ee" colorRoca="#4c5260" />
        <Kicker />
        <group
          position={[r.x, r.y, r.z]}
          rotation={[r.enAire ? suave(tramo(ta, POP, POP + 0.35)) * 0.45 : 0, -Math.min(0.9, Math.max(0, edadAterrizaje) * 1.6), r.pendiente]}
        >
          <Atleta tipo="snowboard" pose={pose} silueta />
        </group>
        <Estallido
          cantidad={500}
          origen={[0.2, Y_LABIO - 0.1, 0]}
          edad={ta - POP + 0.05}
          direccion={[1, 0.6, 0.2]}
          apertura={0.45}
          velocidad={5}
          gravedad={4}
          vida={1.6}
          tam={1.4}
          semilla="pop"
        />
        <Estallido
          cantidad={3200}
          origen={[X_ATERRIZA, suelo(X_ATERRIZA) + 0.2, 0]}
          edad={edadAterrizaje}
          direccion={[CAM_BAJA[0] - X_ATERRIZA, 2.2, CAM_BAJA[2]]}
          apertura={0.36}
          velocidad={15}
          gravedad={4}
          arrastre={0.7}
          vida={2}
          tam={4.5}
          semilla="aterrizaje"
        />
        <Estallido
          cantidad={700}
          origen={[X_ATERRIZA, suelo(X_ATERRIZA) + 0.4, 0]}
          edad={edadAterrizaje}
          direccion={[CAM_BAJA[0] - X_ATERRIZA, 3, CAM_BAJA[2]]}
          apertura={0.5}
          velocidad={9}
          gravedad={1.5}
          arrastre={1.2}
          vida={2.5}
          tam={12}
          semilla="nube"
        />
        <NieveCayendo cantidad={900} centro={[APICE[0], APICE[1], 0]} caja={[40, 18, 24]} tiempo={ta * 30} caida={0.03} viento={[0.04, 0.01]} tam={0.6} opacidad={0.9} />
      </Escena3D>
      <Destello x={sol.x} y={sol.y} fuerza={sol.delante ? 0.5 * tramo(t, 6, 16) * (1 - blanco) : 0} />
      <NieveFrente t={ta * 30} cantidad={18} velocidad={[-9, 5]} opacidad={0.6} />
      <RayasVelocidad fuerza={0.6 * Math.max(1 - tramo(t, 4, 14), tramo(t, 44, 50) * (1 - tramo(t, 54, 58)))} t={t} />
      <ExplosionNieve t={t - tAterrizaPantalla} x={puntoAterrizaje.x} y={puntoAterrizaje.y} cantidad={70} />
      <Vineta fuerza={0.35} />
      <TituloImpacto lineas={["RED BULL", "TE DA ALAS"]} t={t - 15} y={800} tam={190} salida={t - 43} />
      <Flash fuerza={Math.max(0.7 * (1 - tramo(t, 0, 5)), (1 - tramo(t, 15, 21)) * (t >= 15 ? 0.55 : 0), blanco)} />
    </AbsoluteFill>
  );
};
