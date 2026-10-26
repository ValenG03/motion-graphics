// Genera TODA la música y los efectos de sonido del spot con matemática pura (sin descargas).
// Uso: node scripts/generar-audio.mjs   → escribe WAV en public/audio/
import fs from "node:fs";
import path from "node:path";

const SR = 48000;
const DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "public", "audio");
fs.mkdirSync(DIR, { recursive: true });

// ---------- Utilidades ----------
const azar = (semilla) => {
  // mulberry32: ruido determinístico (mismo resultado cada vez)
  let a = semilla >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const estereo = (seg) => [new Float32Array(Math.ceil(seg * SR)), new Float32Array(Math.ceil(seg * SR))];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const notaHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// Filtro biquad (recetas RBJ), con cambio de frecuencia en el tiempo.
class Biquad {
  constructor(tipo, f, q = 0.707) {
    this.tipo = tipo;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(f, q);
  }
  set(f, q = this.q ?? 0.707) {
    this.q = q;
    const w = (2 * Math.PI * clamp(f, 10, SR * 0.45)) / SR;
    const cs = Math.cos(w);
    const al = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    const a0 = 1 + al;
    if (this.tipo === "lp") [b0, b1, b2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
    else if (this.tipo === "hp") [b0, b1, b2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
    else [b0, b1, b2] = [al, 0, -al]; // pasabanda
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cs) / a0;
    this.a2 = (1 - al) / a0;
  }
  p(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

// Diente de sierra sin "aliasing" (polyBLEP).
const blep = (t, dt) => {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
};

// Reverb tipo Freeverb (8 peines + 4 pasatodo por canal).
const reverb = (L, R, { tamano = 0.84, amort = 0.3, mezcla = 0.25 } = {}) => {
  const esc = SR / 44100;
  const peines = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const pasa = [556, 441, 341, 225];
  const proc = (entrada, desfase) => {
    const out = new Float32Array(entrada.length);
    const cs = peines.map((n) => ({ b: new Float32Array(Math.round((n + desfase) * esc)), i: 0, f: 0 }));
    const as = pasa.map((n) => ({ b: new Float32Array(Math.round((n + desfase) * esc)), i: 0 }));
    for (let n = 0; n < entrada.length; n++) {
      const x = entrada[n] * 0.015;
      let s = 0;
      for (const c of cs) {
        const y = c.b[c.i];
        c.f = y * (1 - amort) + c.f * amort;
        c.b[c.i] = x + c.f * tamano;
        c.i = (c.i + 1) % c.b.length;
        s += y;
      }
      for (const a of as) {
        const y = a.b[a.i];
        a.b[a.i] = s + y * 0.5;
        a.i = (a.i + 1) % a.b.length;
        s = y - s;
      }
      out[n] = s;
    }
    return out;
  };
  const rl = proc(L, 0);
  const rr = proc(R, 23);
  for (let n = 0; n < L.length; n++) {
    L[n] = L[n] * (1 - mezcla * 0.5) + rl[n] * mezcla;
    R[n] = R[n] * (1 - mezcla * 0.5) + rr[n] * mezcla;
  }
};

// Limitador suave + normalización final.
const masterizar = ([L, R], pico = 0.92, saturar = 1.2) => {
  for (let n = 0; n < L.length; n++) {
    L[n] = Math.tanh(L[n] * saturar) / Math.tanh(saturar);
    R[n] = Math.tanh(R[n] * saturar) / Math.tanh(saturar);
  }
  let m = 1e-9;
  for (let n = 0; n < L.length; n++) m = Math.max(m, Math.abs(L[n]), Math.abs(R[n]));
  const g = pico / m;
  for (let n = 0; n < L.length; n++) {
    L[n] *= g;
    R[n] *= g;
  }
  return [L, R];
};

const escribirWav = (nombre, [L, R]) => {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(clamp(L[i], -1, 1) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(clamp(R[i], -1, 1) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(path.join(DIR, nombre), buf);
  console.log(`  ✓ ${nombre} (${(n / SR).toFixed(2)} s)`);
};

// Suma un sonido mono en una posición (seg) con paneo (-1 izq, 1 der).
const sumar = ([L, R], mono, desde, vol = 1, pan = 0) => {
  const i0 = Math.round(desde * SR);
  const gl = vol * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = vol * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let n = 0; n < mono.length; n++) {
    const k = i0 + n;
    if (k < 0 || k >= L.length) continue;
    L[k] += mono[n] * gl;
    R[k] += mono[n] * gr;
  }
};

// ---------- Instrumentos de batería ----------
const bombo = (fuerte = 1) => {
  const d = 0.5;
  const o = new Float32Array(d * SR);
  let fase = 0;
  for (let n = 0; n < o.length; n++) {
    const t = n / SR;
    const f = 46 + 130 * Math.exp(-t * 32) * fuerte;
    fase += (2 * Math.PI * f) / SR;
    const amp = Math.exp(-t * (6 - fuerte * 1.5));
    const clic = n < SR * 0.004 ? (1 - n / (SR * 0.004)) * 0.6 : 0;
    o[n] = Math.tanh((Math.sin(fase) * amp + clic) * 1.8);
  }
  return o;
};

const clap = (semilla) => {
  const r = azar(semilla);
  const o = new Float32Array(0.35 * SR);
  const bp = new Biquad("bp", 1400, 0.9);
  const cuerpo = new Biquad("bp", 220, 2);
  for (let n = 0; n < o.length; n++) {
    const t = n / SR;
    // Tres "aplausos" seguidos y una cola.
    let env = 0;
    for (const k of [0, 0.011, 0.022]) if (t >= k) env = Math.max(env, Math.exp(-(t - k) * 140));
    env = Math.max(env, t > 0.03 ? Math.exp(-(t - 0.03) * 18) * 0.55 : 0);
    const ruido = r() * 2 - 1;
    o[n] = bp.p(ruido) * env * 2.2 + cuerpo.p(ruido) * Math.exp(-t * 30) * 0.8;
  }
  return o;
};

const hat = (semilla, abierto) => {
  const r = azar(semilla);
  const d = abierto ? 0.22 : 0.06;
  const o = new Float32Array(d * SR);
  const hp = new Biquad("hp", 7500, 0.8);
  for (let n = 0; n < o.length; n++) {
    const t = n / SR;
    // Ruido + parciales metálicos.
    const metal = Math.sign(Math.sin(2 * Math.PI * 4120 * t) + Math.sin(2 * Math.PI * 5933 * t) + Math.sin(2 * Math.PI * 7489 * t));
    o[n] = hp.p((r() * 2 - 1) * 0.7 + metal * 0.3) * Math.exp(-t * (abierto ? 14 : 60));
  }
  return o;
};

const crash = (semilla) => {
  const r = azar(semilla);
  const o = new Float32Array(2.4 * SR);
  const hp = new Biquad("hp", 3800, 0.7);
  const bp = new Biquad("bp", 6200, 0.6);
  for (let n = 0; n < o.length; n++) {
    const t = n / SR;
    const metal = Math.sin(2 * Math.PI * 3311 * t + Math.sin(2 * Math.PI * 1017 * t) * 4) * 0.4;
    const x = (r() * 2 - 1) * 0.8 + metal;
    o[n] = (hp.p(x) * 0.7 + bp.p(x) * 0.6) * (Math.exp(-t * 1.7) * 0.9 + Math.exp(-t * 12) * 0.5);
  }
  return o;
};

const sub = (hz = 52, d = 1.2) => {
  const o = new Float32Array(d * SR);
  let fase = 0;
  for (let n = 0; n < o.length; n++) {
    const t = n / SR;
    fase += (2 * Math.PI * (hz + 30 * Math.exp(-t * 8))) / SR;
    o[n] = Math.sin(fase) * Math.exp(-t * 2.6);
  }
  return o;
};

// ---------- MÚSICA ----------
const generarMusica = () => {
  const seg = 21;
  const mezcla = estereo(seg);
  const graves = estereo(seg); // bajo + acordes (se "bombean" con el bombo)
  const beat = 60 / 120;
  const compas = 4 * beat; // 2 s = una toma

  // Acordes (La menor): Am · F · C · G, uno por toma.
  const acordes = [
    [57, 60, 64, 69],
    [53, 57, 60, 65],
    [55, 60, 64, 67],
    [55, 59, 62, 67],
  ];
  const raices = [45, 41, 48, 43];

  // Bombo en negras (las 10 tomas), con un hueco antes del gran final.
  const tiemposBombo = [];
  for (let b = 0; b < 40; b++) {
    const t = b * beat;
    if (t >= 17.5 && t < 18) continue;
    if (t > 18 && t < 19) continue;
    tiemposBombo.push(t);
  }
  tiemposBombo.push(19, 19.5);
  for (const t of tiemposBombo) sumar(mezcla, bombo(Math.abs(t % 2) < 0.01 ? 1.15 : 1), t, 0.95);

  // GOLPE en cada corte de 2 s: crash + sub.
  for (let c = 0; c <= 9; c++) {
    sumar(mezcla, crash(100 + c), c * 2, c === 9 ? 0.75 : 0.5, c % 2 ? 0.25 : -0.25);
    sumar(mezcla, sub(c === 9 ? 44 : 52, c === 9 ? 2.2 : 1.1), c * 2, c === 9 ? 0.95 : 0.7);
  }
  sumar(mezcla, sub(48, 1), 19, 0.6);
  sumar(mezcla, sub(55, 1), 19.5, 0.5);

  // Clap en 2 y 4 (desde la toma 2), hats en contratiempo y semicorcheas.
  for (let b = 4; b < 36; b++) if (b % 2 === 1) sumar(mezcla, clap(b), b * beat, 0.5, 0.05);
  for (let s = 8; s < 72; s++) {
    const t = s * beat * 0.5;
    if (t >= 17.5 && t < 18) continue;
    sumar(mezcla, hat(500 + s, s % 2 === 1), t, s % 2 === 1 ? 0.28 : 0.12, 0.3);
  }
  for (let s = 32; s < 140; s++) {
    const t = s * beat * 0.25;
    if (t >= 17.5) break;
    if (s % 4 !== 2) sumar(mezcla, hat(900 + s, false), t, 0.07, -0.35);
  }

  // Redoble que se acelera en la toma 9 (montaje): corcheas → semicorcheas → fusas.
  const redoble = [];
  for (let t = 16; t < 17; t += beat / 2) redoble.push(t);
  for (let t = 17; t < 17.5; t += beat / 4) redoble.push(t);
  for (let t = 17.5; t < 18; t += beat / 8) redoble.push(t);
  redoble.forEach((t, i) => sumar(mezcla, clap(2000 + i), t, 0.18 + 0.4 * (i / redoble.length), 0));

  // Bajo: sierra filtrada en corcheas (octava arriba en el contratiempo).
  {
    const [L, R] = graves;
    const lp = new Biquad("lp", 600, 1.1);
    let fase = 0;
    for (let n = 0; n < Math.round(18 * SR); n++) {
      const t = n / SR;
      const bar = Math.floor(t / compas);
      const raiz = raices[bar % 4];
      const corchea = Math.floor(t / (beat / 2));
      const enCorchea = (t % (beat / 2)) / (beat / 2);
      const nota = raiz + (corchea % 2 === 1 ? 12 : 0);
      const f = notaHz(nota);
      fase = (fase + f / SR) % 1;
      const saw = 2 * fase - 1 - blep(fase, f / SR);
      const entrada = bar === 0 ? clamp(t / 1.6, 0, 1) * 0.5 : 1;
      lp.set(250 + 1300 * Math.exp(-enCorchea * 5) * (bar >= 8 ? 1 + (t - 16) * 0.6 : 1), 1.4);
      const v = Math.tanh(lp.p(saw) * 1.6) * 0.32 * entrada * (0.4 + 0.6 * Math.exp(-enCorchea * 2.5));
      L[n] += v;
      R[n] += v;
    }
  }

  // Acordes supersaw (7 sierras desafinadas por nota), golpes sincopados.
  {
    const [L, R] = graves;
    const patron = [0, 0.75, 1.5, 2.5, 3.25]; // en negras dentro del compás
    const lpL = new Biquad("lp", 2000, 0.9);
    const lpR = new Biquad("lp", 2000, 0.9);
    const voces = [];
    for (let v = 0; v < 7; v++) voces.push({ d: (v - 3) * 0.11, pan: (v - 3) / 3, fase: (v * 0.37) % 1 });
    for (let n = 0; n < Math.round(18.0 * SR); n++) {
      const t = n / SR;
      const bar = Math.floor(t / compas);
      if (bar < 1) continue;
      const enBar = (t % compas) / beat;
      let env = 0;
      for (const p of patron) if (enBar >= p) env = Math.exp(-(enBar - p) * beat * 7);
      const notas = acordes[bar % 4];
      let sl = 0;
      let sr = 0;
      for (const nota of notas) {
        for (const v of voces) {
          const f = notaHz(nota + 12) * Math.pow(2, v.d / 12);
          v.fase = (v.fase + f / SR) % 1;
          const s = 2 * v.fase - 1 - blep(v.fase, f / SR);
          sl += s * (1 - v.pan) * 0.5;
          sr += s * (1 + v.pan) * 0.5;
        }
      }
      const abre = bar >= 8 ? 1500 + (t - 16) * 2500 : 1700;
      lpL.set(500 + abre * env, 0.9);
      lpR.set(500 + abre * env, 0.9);
      L[n] += lpL.p(sl) * env * 0.045;
      R[n] += lpR.p(sr) * env * 0.045;
    }
  }

  // Arpegio brillante (tomas 5 a 8).
  {
    const [L, R] = mezcla;
    let fase = 0;
    for (let n = Math.round(8 * SR); n < Math.round(16 * SR); n++) {
      const t = n / SR;
      const bar = Math.floor(t / compas);
      const s16 = Math.floor(t / (beat / 4));
      const en16 = (t % (beat / 4)) / (beat / 4);
      const notas = acordes[bar % 4];
      const nota = notas[[0, 1, 2, 3, 2, 1, 3, 2][s16 % 8]] + 24;
      const f = notaHz(nota);
      fase = (fase + f / SR) % 1;
      const cuadrada = fase < 0.5 ? 1 : -1;
      const v = cuadrada * Math.exp(-en16 * 5) * 0.035;
      const pan = Math.sin(t * 3) * 0.6;
      L[n] += v * (1 - pan);
      R[n] += v * (1 + pan);
    }
  }

  // Gran acorde final (toma 10), con cola larga.
  {
    const [L, R] = mezcla;
    const final = [45, 57, 60, 64, 69, 72, 76];
    const fases = final.map(() => [0, 0.33, 0.66]);
    const lp = new Biquad("lp", 3000, 0.7);
    const lp2 = new Biquad("lp", 3000, 0.7);
    for (let n = Math.round(18 * SR); n < L.length; n++) {
      const t = n / SR - 18;
      let s = 0;
      final.forEach((nota, i) => {
        fases[i] = fases[i].map((ph, k) => {
          const f = notaHz(nota) * (1 + (k - 1) * 0.004);
          const nf = (ph + f / SR) % 1;
          s += (2 * nf - 1 - blep(nf, f / SR)) * (nota < 50 ? 1.4 : 1);
          return nf;
        });
      });
      const env = Math.min(1, t / 0.01) * (0.55 * Math.exp(-t * 0.9) + 0.45);
      const fade = clamp((21 - (t + 18)) / 1.2, 0, 1);
      const cut = 900 + 3500 * Math.exp(-t * 1.5);
      lp.set(cut);
      lp2.set(cut * 1.05);
      L[n] += lp.p(s) * env * fade * 0.03;
      R[n] += lp2.p(s) * env * fade * 0.03;
    }
  }

  // Sidechain: el bajo y los acordes "respiran" con cada bombo.
  {
    const [GL, GR] = graves;
    const [L, R] = mezcla;
    for (let n = 0; n < L.length; n++) {
      const t = n / SR;
      let g = 1;
      for (const tb of tiemposBombo) {
        const d = t - tb;
        if (d >= 0 && d < 0.4) g = Math.min(g, 0.15 + 0.85 * clamp(d / 0.22, 0, 1));
      }
      L[n] += GL[n] * g;
      R[n] += GR[n] * g;
    }
  }

  reverb(...mezcla, { tamano: 0.82, amort: 0.35, mezcla: 0.18 });
  const [L, R] = masterizar(mezcla, 0.85, 0.9);
  // Recortamos a 20 s exactos.
  return [L.slice(0, 20 * SR), R.slice(0, 20 * SR)];
};

// ---------- EFECTOS ----------
const ruidoFiltrado = (seg, semilla, fn) => {
  const r = azar(semilla);
  const o = estereo(seg);
  const filtros = [new Biquad("bp", 800, 1), new Biquad("bp", 800, 1)];
  for (let n = 0; n < o[0].length; n++) {
    const t = n / SR;
    const { f, q, amp, pan = 0 } = fn(t, t / seg);
    filtros[0].set(f, q);
    filtros[1].set(f * 1.03, q);
    const x0 = r() * 2 - 1;
    const x1 = r() * 2 - 1;
    o[0][n] = filtros[0].p(x0) * amp * (1 - pan * 0.7);
    o[1][n] = filtros[1].p(x1) * amp * (1 + pan * 0.7);
  }
  return o;
};

const whoosh = (seg, semilla) =>
  masterizar(
    ruidoFiltrado(seg, semilla, (t, k) => ({
      f: 250 + 4200 * Math.sin(Math.PI * Math.pow(k, 0.8)),
      q: 1.2,
      amp: Math.pow(Math.sin(Math.PI * Math.pow(k, 1.3)), 2),
      pan: -1 + 2 * k,
    })),
    0.8,
  );

const crujido = (seg, semilla, densidad = 900) => {
  // Nieve compacta que cruje: miles de "granitos" cortos filtrados.
  const r = azar(semilla);
  const o = estereo(seg);
  const lp = [new Biquad("lp", 3200, 0.8), new Biquad("lp", 3400, 0.8)];
  const hp = [new Biquad("hp", 300, 0.7), new Biquad("hp", 300, 0.7)];
  let grano = 0;
  let g = 0;
  for (let n = 0; n < o[0].length; n++) {
    const t = n / SR;
    const env = Math.min(1, t / 0.01) * Math.exp(-t * (4 / seg));
    if (r() < (densidad * env) / SR) {
      grano = 1;
      g = 0.3 + r() * 0.7;
    }
    grano *= 0.992;
    const x = (r() * 2 - 1) * grano * g + (r() * 2 - 1) * 0.15 * env;
    o[0][n] = hp[0].p(lp[0].p(x)) * env;
    o[1][n] = hp[1].p(lp[1].p(x * (0.8 + r() * 0.4))) * env;
  }
  return masterizar(o, 0.85);
};

const viento = (seg) => {
  const o = ruidoFiltrado(seg, 77, (t) => ({
    f: 380 + 260 * Math.sin(t * 0.7) + 180 * Math.sin(t * 1.9 + 1),
    q: 0.9 + 0.5 * Math.sin(t * 0.43),
    amp: 0.6 + 0.4 * Math.sin(t * 0.5 + 0.3) * Math.sin(t * 1.3),
    pan: Math.sin(t * 0.37) * 0.6,
  }));
  // Silbido agudo por encima.
  const silbido = ruidoFiltrado(seg, 78, (t) => ({ f: 1800 + 600 * Math.sin(t * 0.9), q: 6, amp: 0.12 * (0.5 + 0.5 * Math.sin(t * 0.6)) }));
  for (let n = 0; n < o[0].length; n++) {
    o[0][n] += silbido[0][n];
    o[1][n] += silbido[1][n];
  }
  return masterizar(o, 0.7);
};

const pssst = () => {
  // Clic metálico de la anilla + siseo del gas que escapa.
  const o = estereo(1.1);
  const r = azar(9);
  const hp = [new Biquad("hp", 2500, 0.7), new Biquad("hp", 2600, 0.7)];
  const bp = new Biquad("bp", 6500, 1.5);
  for (let n = 0; n < o[0].length; n++) {
    const t = n / SR;
    const clic = t < 0.02 ? Math.sin(2 * Math.PI * 3200 * t) * Math.exp(-t * 300) + Math.sin(2 * Math.PI * 5100 * t) * Math.exp(-t * 400) * 0.6 : 0;
    const siseo = t > 0.012 ? Math.min(1, (t - 0.012) / 0.01) * Math.exp(-(t - 0.012) * 3.2) : 0;
    const x = r() * 2 - 1;
    const s = hp[0].p(x) * siseo * 0.8 + bp.p(x) * siseo * 0.5;
    o[0][n] = s + clic;
    o[1][n] = hp[1].p(r() * 2 - 1) * siseo * 0.8 + clic * 0.9;
  }
  return masterizar(o, 0.85);
};

const burbujas = (seg = 1.6) => {
  // Efervescencia: muchos "plip" agudos y cortos + chisporroteo de fondo.
  const o = estereo(seg);
  const r = azar(12);
  const eventos = [];
  for (let i = 0; i < 260; i++) {
    const t0 = Math.pow(r(), 1.6) * seg * 0.9;
    eventos.push({ t0, f: 1400 + r() * 3200, d: 0.008 + r() * 0.02, a: 0.2 + r() * 0.5, pan: r() * 2 - 1, sube: 1 + r() * 0.6 });
  }
  for (const e of eventos) {
    const i0 = Math.round(e.t0 * SR);
    const nmax = Math.round(e.d * 4 * SR);
    let fase = 0;
    for (let n = 0; n < nmax && i0 + n < o[0].length; n++) {
      const t = n / SR;
      fase += (2 * Math.PI * e.f * (1 + (t / e.d) * 0.3 * e.sube)) / SR;
      const v = Math.sin(fase) * Math.exp(-t / e.d) * e.a * Math.exp(-e.t0 * 1.2);
      o[0][i0 + n] += v * (1 - e.pan * 0.6);
      o[1][i0 + n] += v * (1 + e.pan * 0.6);
    }
  }
  const fizz = ruidoFiltrado(seg, 13, (t, k) => ({ f: 7000, q: 0.8, amp: 0.25 * Math.exp(-k * 2.5) }));
  for (let n = 0; n < o[0].length; n++) {
    o[0][n] += fizz[0][n];
    o[1][n] += fizz[1][n];
  }
  return masterizar(o, 0.8);
};

const impacto = (seg, grande) => {
  // Golpe cinematográfico: sub que cae + ruido + "boom" con reverb.
  const o = estereo(seg);
  const r = azar(grande ? 31 : 30);
  const lp = new Biquad("lp", 1200, 0.7);
  let fase = 0;
  for (let n = 0; n < o[0].length; n++) {
    const t = n / SR;
    fase += (2 * Math.PI * (36 + 90 * Math.exp(-t * 10))) / SR;
    const cuerpo = Math.tanh(Math.sin(fase) * 2.2) * Math.exp(-t * (grande ? 1.6 : 3));
    const golpe = lp.p(r() * 2 - 1) * Math.exp(-t * 14) * 1.2;
    const s = cuerpo + golpe;
    o[0][n] = s;
    o[1][n] = s;
  }
  reverb(...o, { tamano: 0.88, amort: 0.25, mezcla: grande ? 0.45 : 0.3 });
  return masterizar(o, 0.95, 1.6);
};

const congelar = () => {
  // Hielo que se forma: chasquidos dispersos cada vez más seguidos + crujido grave.
  const o = estereo(1.3);
  const r = azar(41);
  for (let i = 0; i < 160; i++) {
    const k = Math.pow(r(), 0.6);
    const t0 = k * 1.2;
    const f = 1800 + r() * 5000;
    const i0 = Math.round(t0 * SR);
    const pan = r() * 2 - 1;
    const a = (0.15 + 0.6 * k) * (0.5 + r() * 0.5);
    for (let n = 0; n < SR * 0.015 && i0 + n < o[0].length; n++) {
      const t = n / SR;
      const v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 600) * a + (r() * 2 - 1) * Math.exp(-t * 900) * a * 0.6;
      o[0][i0 + n] += v * (1 - pan * 0.6);
      o[1][i0 + n] += v * (1 + pan * 0.6);
    }
  }
  const grave = ruidoFiltrado(1.3, 42, (t, k) => ({ f: 180 + 120 * k, q: 3, amp: 0.4 * k }));
  for (let n = 0; n < o[0].length; n++) {
    o[0][n] += grave[0][n];
    o[1][n] += grave[1][n];
  }
  return masterizar(o, 0.8);
};

const quiebre = () => {
  // Hielo que estalla: crack seco + lluvia de cristales (parciales inarmónicos) + cola.
  const o = estereo(2.2);
  const r = azar(51);
  const crack = new Biquad("hp", 900, 0.8);
  for (let n = 0; n < SR * 0.25; n++) {
    const t = n / SR;
    const v = crack.p(r() * 2 - 1) * Math.exp(-t * 35) * 1.4;
    o[0][n] += v;
    o[1][n] += v;
  }
  for (let i = 0; i < 90; i++) {
    const t0 = 0.01 + Math.pow(r(), 1.8) * 1.4;
    const f = 2500 + r() * 6000;
    const i0 = Math.round(t0 * SR);
    const pan = r() * 2 - 1;
    const a = (0.1 + r() * 0.35) * Math.exp(-t0 * 1.5);
    for (let n = 0; n < SR * 0.3 && i0 + n < o[0].length; n++) {
      const t = n / SR;
      const v = (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 2.76 * t) * 0.5 + Math.sin(2 * Math.PI * f * 5.4 * t) * 0.25) * Math.exp(-t * 18) * a;
      o[0][i0 + n] += v * (1 - pan * 0.6);
      o[1][i0 + n] += v * (1 + pan * 0.6);
    }
  }
  const golpe = impacto(1, false);
  for (let n = 0; n < golpe[0].length; n++) {
    o[0][n] += golpe[0][n] * 0.6;
    o[1][n] += golpe[1][n] * 0.6;
  }
  reverb(...o, { tamano: 0.85, amort: 0.2, mezcla: 0.3 });
  return masterizar(o, 0.95);
};

const riser = () => {
  // 2 s de tensión: ruido que se abre + tono que sube + trémolo que se acelera.
  const seg = 2;
  const o = ruidoFiltrado(seg, 61, (t, k) => ({ f: 300 + 9000 * Math.pow(k, 2.2), q: 1.6, amp: Math.pow(k, 1.6) * (0.8 + 0.2 * Math.sin(2 * Math.PI * t * (4 + 22 * k))) }));
  let fase = 0;
  let fase2 = 0;
  for (let n = 0; n < o[0].length; n++) {
    const t = n / SR;
    const k = t / seg;
    const f = 110 * Math.pow(2, k * 3);
    fase = (fase + f / SR) % 1;
    fase2 = (fase2 + (f * 1.007) / SR) % 1;
    const tono = (2 * fase - 1 - blep(fase, f / SR) + 2 * fase2 - 1) * 0.25 * Math.pow(k, 1.4);
    o[0][n] += tono;
    o[1][n] += tono;
  }
  return masterizar(o, 0.85);
};

const estallidoColor = () => {
  // "Pop" de color: golpe corto + brillo que sube.
  const o = impacto(1.2, false);
  const brillo = ruidoFiltrado(1.2, 71, (t, k) => ({ f: 3000 + 6000 * k, q: 2, amp: 0.5 * Math.exp(-k * 4) }));
  for (let n = 0; n < o[0].length; n++) {
    o[0][n] = o[0][n] * 0.8 + brillo[0][n];
    o[1][n] = o[1][n] * 0.8 + brillo[1][n];
  }
  return masterizar(o, 0.9);
};

const brillo = () => {
  // Destello mágico cuando la nieve se vuelve lata: arpegio de campanitas.
  const o = estereo(1.4);
  [88, 91, 95, 100, 103].forEach((nota, i) => {
    const i0 = Math.round(i * 0.05 * SR);
    const f = notaHz(nota);
    const pan = -0.6 + i * 0.3;
    for (let n = 0; i0 + n < o[0].length; n++) {
      const t = n / SR;
      const v = (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 2.01 * t) * 0.3) * Math.exp(-t * 4) * 0.3;
      o[0][i0 + n] += v * (1 - pan);
      o[1][i0 + n] += v * (1 + pan);
    }
  });
  reverb(...o, { mezcla: 0.4 });
  return masterizar(o, 0.7);
};

const baranda = () => {
  // Tabla que se desliza sobre metal: chirrido resonante con vibración.
  const seg = 1.4;
  const o = ruidoFiltrado(seg, 81, (t, k) => ({ f: 1150 + 80 * Math.sin(t * 40), q: 9, amp: Math.min(1, t / 0.03) * (1 - k * 0.3) }));
  const grave = ruidoFiltrado(seg, 82, () => ({ f: 220, q: 4, amp: 0.5 }));
  for (let n = 0; n < o[0].length; n++) {
    o[0][n] += grave[0][n];
    o[1][n] += grave[1][n];
  }
  return masterizar(o, 0.75);
};

const raspadoHielo = () => {
  // Cantos de las latas tallando el hielo, en curvas (sube y baja).
  const seg = 1.2;
  return masterizar(
    ruidoFiltrado(seg, 91, (t, k) => ({ f: 2600 + 1400 * Math.sin(t * 9), q: 2.5, amp: (0.4 + 0.6 * Math.abs(Math.sin(t * 6))) * Math.min(1, t / 0.05) * (1 - k * 0.5), pan: Math.sin(t * 6) * 0.8 })),
    0.75,
  );
};

const frenadaHielo = () => {
  const seg = 1.1;
  const o = ruidoFiltrado(seg, 92, (t, k) => ({ f: 4200 - 2500 * k, q: 1.4, amp: Math.min(1, t / 0.02) * Math.exp(-k * 2.6) }));
  const nieve = crujido(seg, 93, 1500);
  for (let n = 0; n < o[0].length; n++) {
    o[0][n] += nieve[0][n] * 0.6;
    o[1][n] += nieve[1][n] * 0.6;
  }
  return masterizar(o, 0.85);
};

const polvo = () => {
  // Giro en nieve polvo: soplido profundo + crujido suave.
  const seg = 1.8;
  const o = ruidoFiltrado(seg, 101, (t, k) => ({ f: 500 + 1800 * Math.sin(Math.PI * k), q: 0.8, amp: Math.sin(Math.PI * k), pan: -0.5 + k }));
  const nieve = crujido(seg, 102, 500);
  for (let n = 0; n < o[0].length; n++) {
    o[0][n] += nieve[0][n] * 0.5;
    o[1][n] += nieve[1][n] * 0.5;
  }
  return masterizar(o, 0.8);
};

const golpeNieve = () => {
  // Latas que caen en la nieve: tres "pufs" sordos seguidos.
  const o = estereo(0.9);
  [0, 0.09, 0.2, 0.3].forEach((t0, i) => {
    const c = crujido(0.35, 110 + i, 2500);
    const pan = -0.6 + i * 0.4;
    sumar(o, c[0].map((v, n) => (v + c[1][n]) * 0.5), t0, 0.7, pan);
    const b = bombo(0.3);
    sumar(o, b, t0, 0.35, pan);
  });
  return masterizar(o, 0.85);
};

console.log("Generando música y efectos...");
escribirWav("musica.wav", generarMusica());
escribirWav("whoosh.wav", whoosh(0.7, 1));
escribirWav("whoosh-largo.wav", whoosh(1.2, 2));
escribirWav("whoosh-corto.wav", whoosh(0.3, 3));
escribirWav("crujido.wav", crujido(0.55, 4));
escribirWav("viento.wav", viento(20));
escribirWav("pssst.wav", pssst());
escribirWav("burbujas.wav", burbujas());
escribirWav("impacto.wav", impacto(1.6, false));
escribirWav("impacto-grande.wav", impacto(3, true));
escribirWav("congelar.wav", congelar());
escribirWav("quiebre.wav", quiebre());
escribirWav("riser.wav", riser());
escribirWav("estallido-color.wav", estallidoColor());
escribirWav("brillo.wav", brillo());
escribirWav("baranda.wav", baranda());
escribirWav("raspado-hielo.wav", raspadoHielo());
escribirWav("frenada-hielo.wav", frenadaHielo());
escribirWav("polvo.wav", polvo());
escribirWav("golpe-nieve.wav", golpeNieve());
console.log("Listo.");
