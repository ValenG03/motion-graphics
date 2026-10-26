// Momentos (en cuadros del video completo, 30 fps) en que suena cada efecto.
// Salen de las rampas de tiempo de cada toma; el generador de audio y la composición
// usan esta misma lista.

export const FPS = 30;
export const DURACION = 600;
// Música a 120 BPM: un compás = 2 s = 60 cuadros = una toma. Cada corte cae en el tiempo 1.
export const BPM = 120;
export const CORTES = [60, 120, 180, 240, 300, 360, 420, 480, 540];

export type Marca = { archivo: string; cuadro: number; volumen: number; nombre: string };

export const MARCAS: Marca[] = [
  // Toma 1 · salto
  { nombre: "Impacto del título", archivo: "impacto.wav", cuadro: 15, volumen: 0.9 },
  { nombre: "Tabla sale del kicker", archivo: "crujido.wav", cuadro: 8, volumen: 0.7 },
  { nombre: "Aterrizaje en la nieve", archivo: "crujido.wav", cuadro: 52, volumen: 1 },
  { nombre: "Nieve contra la lente", archivo: "whoosh.wav", cuadro: 50, volumen: 0.8 },
  // Toma 2 · lata clásica
  { nombre: "Remolino de nieve", archivo: "whoosh-largo.wav", cuadro: 62, volumen: 0.6 },
  { nombre: "Aparece la lata", archivo: "brillo.wav", cuadro: 80, volumen: 0.55 },
  { nombre: "Pssst de la lata", archivo: "pssst.wav", cuadro: 112, volumen: 1 },
  { nombre: "Burbujas", archivo: "burbujas.wav", cuadro: 114, volumen: 0.7 },
  // Toma 3 · Infinite Lines
  { nombre: "Esquís salen del kicker", archivo: "crujido.wav", cuadro: 125, volumen: 0.6 },
  { nombre: "Aterrizaje esquiador", archivo: "crujido.wav", cuadro: 168, volumen: 0.9 },
  // Toma 4 · latas en el hielo
  { nombre: "Latas tallando el hielo", archivo: "raspado-hielo.wav", cuadro: 184, volumen: 0.6 },
  { nombre: "Frenada en el hielo", archivo: "frenada-hielo.wav", cuadro: 200, volumen: 0.85 },
  // Toma 5 · Heavy Metal
  { nombre: "Tabla sobre la baranda", archivo: "baranda.wav", cuadro: 278, volumen: 0.55 },
  // Toma 6 · Editions
  { nombre: "Explota Red Edition", archivo: "estallido-color.wav", cuadro: 315, volumen: 0.85 },
  { nombre: "Explota Green Edition", archivo: "estallido-color.wav", cuadro: 330, volumen: 0.85 },
  { nombre: "Explota Pomelo Edition", archivo: "estallido-color.wav", cuadro: 345, volumen: 0.85 },
  { nombre: "Burbujas de las Editions", archivo: "burbujas.wav", cuadro: 318, volumen: 0.35 },
  // Toma 7 · Natural Selection
  { nombre: "Giro en nieve polvo", archivo: "polvo.wav", cuadro: 364, volumen: 0.75 },
  // Toma 8 · Winter Edition
  { nombre: "Hielo congelándose", archivo: "congelar.wav", cuadro: 423, volumen: 0.8 },
  { nombre: "Hielo se quiebra", archivo: "quiebre.wav", cuadro: 459, volumen: 1 },
  // Toma 9 · montaje + riser
  { nombre: "Riser antes del cierre", archivo: "riser.wav", cuadro: 480, volumen: 0.9 },
  { nombre: "Corte montaje 2", archivo: "whoosh-corto.wav", cuadro: 486, volumen: 0.5 },
  { nombre: "Corte montaje 3", archivo: "whoosh-corto.wav", cuadro: 493, volumen: 0.5 },
  { nombre: "Corte montaje 4", archivo: "whoosh-corto.wav", cuadro: 501, volumen: 0.5 },
  { nombre: "Corte montaje 5", archivo: "whoosh-corto.wav", cuadro: 508, volumen: 0.5 },
  { nombre: "Corte montaje 6", archivo: "whoosh-corto.wav", cuadro: 515, volumen: 0.5 },
  { nombre: "Corte montaje 7", archivo: "whoosh-corto.wav", cuadro: 522, volumen: 0.45 },
  { nombre: "Corte montaje 8", archivo: "whoosh-corto.wav", cuadro: 526, volumen: 0.45 },
  { nombre: "Corte montaje 9", archivo: "whoosh-corto.wav", cuadro: 530, volumen: 0.45 },
  { nombre: "Corte montaje 10", archivo: "whoosh-corto.wav", cuadro: 534, volumen: 0.45 },
  // Toma 10 · cierre
  { nombre: "Impacto del cierre", archivo: "impacto-grande.wav", cuadro: 540, volumen: 1 },
  { nombre: "Latas caen en la nieve", archivo: "golpe-nieve.wav", cuadro: 548, volumen: 0.6 },
  { nombre: "Choque de los toros", archivo: "impacto.wav", cuadro: 570, volumen: 0.95 },
  { nombre: "Frase final", archivo: "impacto.wav", cuadro: 585, volumen: 0.8 },
  // Whoosh en cada corte de toma (empieza un poco antes del corte)
  ...CORTES.filter((c) => c !== 60 && c !== 480 && c !== 540).map((c) => ({
    nombre: `Whoosh corte ${c / 30} s`,
    archivo: "whoosh.wav",
    cuadro: c - 9,
    volumen: 0.7,
  })),
];

// Tramos con viento de montaña (cuadro inicial, final, volumen).
export const VIENTO: [number, number, number][] = [
  [0, 62, 0.5],
  [120, 182, 0.45],
  [180, 240, 0.25],
  [360, 422, 0.55],
  [480, 542, 0.35],
  [540, 600, 0.4],
];
