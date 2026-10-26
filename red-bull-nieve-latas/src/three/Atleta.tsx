import React, { useMemo } from "react";
import * as THREE from "three";
import { COLORES } from "../marca";

// Atleta estilizado (snowboard o esquí) armado con cápsulas.
// Marco local: y arriba, el pecho mira a +z. La tabla va a lo largo de x; los esquís a lo largo de z.
// Rodillas y codos se resuelven con cinemática inversa de dos huesos.

export type V3 = [number, number, number];

export type Pose = {
  cadera: number; // altura de la pelvis sobre la tabla / esquís (m)
  caderaZ: number; // pelvis adelante (+) o atrás (-)
  inclinacion: number; // torso hacia adelante (+), rad
  ladeo: number; // torso hacia los costados, rad
  giro: number; // giro del torso alrededor de la vertical, rad
  cabeza: number; // cabeza hacia abajo (+) / arriba (-)
  manoIzq: V3; // destino de cada mano, relativo a la pelvis
  manoDer: V3;
};

const L_MUSLO = 0.46;
const L_CANILLA = 0.46;
const L_BRAZO = 0.3;
const L_ANTEBRAZO = 0.28;
const L_BASTON = 1.15;

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const ik = (raiz: THREE.Vector3, destino: THREE.Vector3, l1: number, l2: number, polo: THREE.Vector3) => {
  const haciaDestino = destino.clone().sub(raiz);
  const dist = THREE.MathUtils.clamp(haciaDestino.length(), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  const dir = haciaDestino.normalize();
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const curva = polo.clone().sub(dir.clone().multiplyScalar(polo.dot(dir))).normalize();
  const articulacion = raiz.clone().add(dir.clone().multiplyScalar(a)).add(curva.multiplyScalar(h));
  const fin = raiz.clone().add(dir.clone().multiplyScalar(dist));
  return { articulacion, fin };
};

const ARRIBA = v(0, 1, 0);

const Hueso: React.FC<{
  readonly a: THREE.Vector3;
  readonly b: THREE.Vector3;
  readonly geo: THREE.BufferGeometry;
  readonly mat: THREE.Material;
}> = ({ a, b, geo, mat }) => {
  const medio = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(ARRIBA, b.clone().sub(a).normalize());
  return <mesh geometry={geo} material={mat} position={medio} quaternion={q} />;
};

const geos = (() => {
  let cache: Record<string, THREE.BufferGeometry> | null = null;
  return () => {
    if (cache) return cache;
    const tabla = (() => {
      const s = new THREE.Shape();
      const largo = 1.56;
      const ancho = 0.27;
      const r = ancho / 2;
      s.moveTo(-largo / 2 + r, -ancho / 2);
      s.lineTo(largo / 2 - r, -ancho / 2 + 0.012);
      s.absarc(largo / 2 - r, 0, r - 0.012, -Math.PI / 2, Math.PI / 2, false);
      s.lineTo(-largo / 2 + r, ancho / 2);
      s.absarc(-largo / 2 + r, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
      const g = new THREE.ExtrudeGeometry(s, {
        depth: 0.018,
        bevelEnabled: true,
        bevelSize: 0.006,
        bevelThickness: 0.006,
        bevelSegments: 1,
        curveSegments: 18,
      });
      g.rotateX(Math.PI / 2);
      return g;
    })();
    cache = {
      torso: new THREE.CapsuleGeometry(0.17, 0.36, 6, 14),
      cadera: new THREE.SphereGeometry(0.16, 14, 10),
      muslo: new THREE.CapsuleGeometry(0.095, L_MUSLO - 0.04, 4, 10),
      canilla: new THREE.CapsuleGeometry(0.08, L_CANILLA - 0.05, 4, 10),
      brazo: new THREE.CapsuleGeometry(0.068, L_BRAZO - 0.03, 4, 10),
      antebrazo: new THREE.CapsuleGeometry(0.058, L_ANTEBRAZO - 0.03, 4, 10),
      mano: new THREE.SphereGeometry(0.065, 10, 8),
      cabeza: new THREE.SphereGeometry(0.115, 18, 14),
      casco: new THREE.SphereGeometry(0.135, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
      antiparras: new THREE.BoxGeometry(0.2, 0.065, 0.06),
      bota: new THREE.BoxGeometry(0.13, 0.13, 0.3),
      tabla,
      esqui: new THREE.BoxGeometry(0.085, 0.016, 1.5),
      punta: new THREE.BoxGeometry(0.085, 0.016, 0.22),
      baston: new THREE.CylinderGeometry(0.011, 0.009, L_BASTON, 6),
      roseta: new THREE.CylinderGeometry(0.05, 0.05, 0.01, 10),
    };
    return cache;
  };
})();

export const Atleta: React.FC<{
  readonly tipo: "snowboard" | "esqui";
  readonly pose: Pose;
  readonly silueta?: boolean;
  readonly colorCampera?: string;
  readonly bastonIzq?: V3;
  readonly bastonDer?: V3;
}> = ({ tipo, pose, silueta = false, colorCampera = COLORES.azul, bastonIzq = [0, -1, -0.6], bastonDer = [0, -1, -0.6] }) => {
  const g = geos();
  const m = useMemo(() => {
    if (silueta) {
      // Silueta pura: material sin luz, siempre oscuro contra el cielo.
      const negro = new THREE.MeshBasicMaterial({ color: "#04060d", fog: false });
      return { campera: negro, pantalon: negro, casco: negro, antiparras: negro, guante: negro, bota: negro, tabla: negro, esqui: negro, baston: negro };
    }
    return {
      campera: new THREE.MeshStandardMaterial({ color: colorCampera, roughness: 0.75 }),
      pantalon: new THREE.MeshStandardMaterial({ color: "#23262f", roughness: 0.85 }),
      casco: new THREE.MeshStandardMaterial({ color: COLORES.rojo, roughness: 0.3, metalness: 0.2 }),
      antiparras: new THREE.MeshStandardMaterial({ color: COLORES.oro, roughness: 0.05, metalness: 0.9, emissive: "#ff9a00", emissiveIntensity: 0.25 }),
      guante: new THREE.MeshStandardMaterial({ color: "#15171d", roughness: 0.8 }),
      bota: new THREE.MeshStandardMaterial({ color: "#15171d", roughness: 0.7 }),
      tabla: new THREE.MeshStandardMaterial({ color: COLORES.rojo, roughness: 0.35, metalness: 0.1 }),
      esqui: new THREE.MeshStandardMaterial({ color: COLORES.amarillo, roughness: 0.35, metalness: 0.1 }),
      baston: new THREE.MeshStandardMaterial({ color: "#c7c9cf", roughness: 0.3, metalness: 0.8 }),
    };
  }, [silueta, colorCampera]);

  const esSnow = tipo === "snowboard";
  const pelvis = v(0, pose.cadera, pose.caderaZ);
  const qTorso = new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.inclinacion, pose.giro, pose.ladeo, "YXZ"));
  const enTorso = (x: number, y: number, z: number) => v(x, y, z).applyQuaternion(qTorso).add(pelvis);

  const pieI = esSnow ? v(-0.27, 0.085, 0) : v(-0.12, 0.085, 0);
  const pieD = esSnow ? v(0.27, 0.085, 0) : v(0.12, 0.085, 0);
  const cadI = pelvis.clone().add(v(-0.1, -0.02, 0));
  const cadD = pelvis.clone().add(v(0.1, -0.02, 0));
  const piernaI = ik(cadI, pieI, L_MUSLO, L_CANILLA, v(esSnow ? -0.35 : -0.08, 0, 1));
  const piernaD = ik(cadD, pieD, L_MUSLO, L_CANILLA, v(esSnow ? 0.35 : 0.08, 0, 1));

  const cuello = enTorso(0, 0.6, 0);
  const qCabeza = qTorso.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.cabeza, 0, 0)));
  const cabeza = cuello.clone().add(v(0, 0.15, 0.02).applyQuaternion(qCabeza));
  const hombroI = enTorso(-0.21, 0.5, 0);
  const hombroD = enTorso(0.21, 0.5, 0);
  const brazoI = ik(hombroI, pelvis.clone().add(v(...pose.manoIzq)), L_BRAZO, L_ANTEBRAZO, v(-0.4, -1, -0.5).applyQuaternion(qTorso));
  const brazoD = ik(hombroD, pelvis.clone().add(v(...pose.manoDer)), L_BRAZO, L_ANTEBRAZO, v(0.4, -1, -0.5).applyQuaternion(qTorso));

  const torsoA = enTorso(0, 0.12, 0);
  const torsoB = enTorso(0, 0.46, 0);

  const baston = (mano: THREE.Vector3, dir: V3, k: string) => {
    const d = v(...dir).normalize();
    const fin = mano.clone().add(d.clone().multiplyScalar(L_BASTON));
    const q = new THREE.Quaternion().setFromUnitVectors(ARRIBA, d);
    return (
      <group key={k}>
        <mesh geometry={g.baston} material={m.baston} position={mano.clone().add(fin).multiplyScalar(0.5)} quaternion={q} />
        <mesh geometry={g.roseta} material={m.baston} position={mano.clone().add(d.clone().multiplyScalar(L_BASTON - 0.1))} quaternion={q} />
      </group>
    );
  };

  return (
    <group>
      {/* Piernas */}
      <Hueso a={cadI} b={piernaI.articulacion} geo={g.muslo} mat={m.pantalon} />
      <Hueso a={piernaI.articulacion} b={piernaI.fin} geo={g.canilla} mat={m.pantalon} />
      <Hueso a={cadD} b={piernaD.articulacion} geo={g.muslo} mat={m.pantalon} />
      <Hueso a={piernaD.articulacion} b={piernaD.fin} geo={g.canilla} mat={m.pantalon} />
      <mesh geometry={g.bota} material={m.bota} position={[pieI.x, 0.075, 0.02]} rotation={[0, esSnow ? 0.25 : 0, 0]} />
      <mesh geometry={g.bota} material={m.bota} position={[pieD.x, 0.075, 0.02]} rotation={[0, esSnow ? -0.25 : 0, 0]} />
      {/* Torso, cabeza y casco */}
      <mesh geometry={g.cadera} material={m.pantalon} position={pelvis} />
      <Hueso a={torsoA} b={torsoB} geo={g.torso} mat={m.campera} />
      <mesh geometry={g.cabeza} material={m.guante} position={cabeza} />
      <mesh geometry={g.casco} material={m.casco} position={cabeza.clone().add(v(0, 0.005, -0.005).applyQuaternion(qCabeza))} quaternion={qCabeza} />
      <mesh geometry={g.antiparras} material={m.antiparras} position={cabeza.clone().add(v(0, 0.01, 0.105).applyQuaternion(qCabeza))} quaternion={qCabeza} />
      {/* Brazos */}
      <Hueso a={hombroI} b={brazoI.articulacion} geo={g.brazo} mat={m.campera} />
      <Hueso a={brazoI.articulacion} b={brazoI.fin} geo={g.antebrazo} mat={m.campera} />
      <Hueso a={hombroD} b={brazoD.articulacion} geo={g.brazo} mat={m.campera} />
      <Hueso a={brazoD.articulacion} b={brazoD.fin} geo={g.antebrazo} mat={m.campera} />
      <mesh geometry={g.mano} material={m.guante} position={brazoI.fin} />
      <mesh geometry={g.mano} material={m.guante} position={brazoD.fin} />
      {/* Equipo */}
      {esSnow ? (
        <mesh geometry={g.tabla} material={m.tabla} position={[0, 0.012, 0]} />
      ) : (
        <>
          {[-0.12, 0.12].map((x) => (
            <group key={x} position={[x, 0.008, 0.05]}>
              <mesh geometry={g.esqui} material={m.esqui} />
              <mesh geometry={g.punta} material={m.esqui} position={[0, 0.03, 0.83]} rotation={[-0.42, 0, 0]} />
              <mesh geometry={g.punta} material={m.esqui} position={[0, 0.025, -0.82]} rotation={[0.36, 0, 0]} />
            </group>
          ))}
          {baston(brazoI.fin, bastonIzq, "bi")}
          {baston(brazoD.fin, bastonDer, "bd")}
        </>
      )}
    </group>
  );
};

// Interpola entre poses clave con suavizado (t en cuadros de acción).
export const poseEn = (claves: readonly (readonly [number, Pose])[], t: number): Pose => {
  if (t <= claves[0][0]) return claves[0][1];
  for (let i = 0; i < claves.length - 1; i++) {
    const [a, pa] = claves[i];
    const [b, pb] = claves[i + 1];
    if (t <= b) {
      const x = (t - a) / (b - a);
      const k = x * x * (3 - 2 * x);
      const n = (p: number, q: number) => p + (q - p) * k;
      const n3 = (p: V3, q: V3): V3 => [n(p[0], q[0]), n(p[1], q[1]), n(p[2], q[2])];
      return {
        cadera: n(pa.cadera, pb.cadera),
        caderaZ: n(pa.caderaZ, pb.caderaZ),
        inclinacion: n(pa.inclinacion, pb.inclinacion),
        ladeo: n(pa.ladeo, pb.ladeo),
        giro: n(pa.giro, pb.giro),
        cabeza: n(pa.cabeza, pb.cabeza),
        manoIzq: n3(pa.manoIzq, pb.manoIzq),
        manoDer: n3(pa.manoDer, pb.manoDer),
      };
    }
  }
  return claves[claves.length - 1][1];
};

// Poses de referencia.
export const POSES = {
  // Snowboard
  snowBajada: { cadera: 0.82, caderaZ: 0.04, inclinacion: 0.25, ladeo: 0.05, giro: 0.15, cabeza: 0.1, manoIzq: [-0.55, 0.15, 0.25], manoDer: [0.5, 0.1, 0.15] },
  snowCompresion: { cadera: 0.6, caderaZ: 0.08, inclinacion: 0.55, ladeo: 0, giro: 0.1, cabeza: -0.1, manoIzq: [-0.35, -0.15, 0.45], manoDer: [0.4, -0.2, 0.35] },
  snowPop: { cadera: 0.9, caderaZ: 0.02, inclinacion: 0.1, ladeo: -0.05, giro: 0.2, cabeza: -0.25, manoIzq: [-0.5, 0.55, 0.2], manoDer: [0.5, 0.45, 0.1] },
  snowMethod: { cadera: 0.52, caderaZ: -0.1, inclinacion: -0.05, ladeo: 0.25, giro: -0.3, cabeza: -0.3, manoIzq: [-0.75, 0.55, 0.1], manoDer: [0.15, -0.45, -0.18] },
  snowAterrizaje: { cadera: 0.62, caderaZ: 0.06, inclinacion: 0.45, ladeo: 0, giro: 0.1, cabeza: 0, manoIzq: [-0.6, 0.0, 0.3], manoDer: [0.6, 0.0, 0.2] },
  snowCarve: { cadera: 0.66, caderaZ: 0.12, inclinacion: 0.45, ladeo: -0.15, giro: 0.35, cabeza: 0.05, manoIzq: [-0.45, -0.25, 0.55], manoDer: [0.55, 0.2, 0.0] },
  snowSlide: { cadera: 0.78, caderaZ: 0.0, inclinacion: 0.15, ladeo: 0.0, giro: 0.6, cabeza: 0.15, manoIzq: [-0.65, 0.35, 0.05], manoDer: [0.6, 0.3, -0.05] },
  // Esquí
  esquiBajada: { cadera: 0.72, caderaZ: -0.05, inclinacion: 0.45, ladeo: 0, giro: 0, cabeza: -0.1, manoIzq: [-0.32, 0.12, 0.35], manoDer: [0.32, 0.12, 0.35] },
  esquiPop: { cadera: 0.9, caderaZ: 0, inclinacion: 0.15, ladeo: 0, giro: 0, cabeza: -0.35, manoIzq: [-0.45, 0.65, 0.15], manoDer: [0.45, 0.65, 0.15] },
  esquiTuck: { cadera: 0.5, caderaZ: 0.1, inclinacion: 0.75, ladeo: 0, giro: 0, cabeza: 0.2, manoIzq: [-0.2, -0.2, 0.35], manoDer: [0.2, -0.2, 0.35] },
  esquiAbierto: { cadera: 0.86, caderaZ: -0.04, inclinacion: -0.1, ladeo: 0, giro: 0, cabeza: -0.5, manoIzq: [-0.6, 0.35, -0.1], manoDer: [0.6, 0.35, -0.1] },
} satisfies Record<string, Pose>;
