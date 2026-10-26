import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Colores de referencia de la marca (Red Bull no publica sus hex oficiales).
export const COLORES = {
  azul: "#223971",
  azulProfundo: "#121F45",
  azulNoche: "#070D24",
  plateado: "#C0BFBF",
  plateadoClaro: "#E6E8EC",
  rojo: "#E21B4D",
  amarillo: "#FFD300",
  oro: "#FFC800",
  nieve: "#F4F8FF",
  hielo: "#A9D4EE",
} as const;

export type VarianteLata =
  | "clasica"
  | "sugarfree"
  | "zero"
  | "red"
  | "green"
  | "pomelo"
  | "winter";

type DatosLata = {
  nombre: string;
  linea2: string;
  // Tonos del damero (cuadros) y del panel del logo.
  tono1: string;
  tono2: string;
  tono3: string;
  tono4: string;
  texto: string;
  // Color de la explosión de partículas / luces de la toma.
  acento: string;
};

export const LATAS: Record<VarianteLata, DatosLata> = {
  clasica: {
    nombre: "ENERGY DRINK",
    linea2: "",
    tono1: "#223971",
    tono2: "#1A2C5C",
    tono3: "#C9CBD0",
    tono4: "#B2B5BC",
    texto: "#223971",
    acento: "#4F7BD8",
  },
  sugarfree: {
    nombre: "SUGARFREE",
    linea2: "",
    tono1: "#4FA3DC",
    tono2: "#3E8DC6",
    tono3: "#CDD1D6",
    tono4: "#B8BCC3",
    texto: "#2F7FBF",
    acento: "#7CC4F2",
  },
  zero: {
    nombre: "ZERO",
    linea2: "",
    tono1: "#121F45",
    tono2: "#0B1430",
    tono3: "#C4C6CB",
    tono4: "#AEB1B8",
    texto: "#121F45",
    acento: "#9FB3E8",
  },
  red: {
    nombre: "THE RED EDITION",
    linea2: "SANDÍA",
    tono1: "#D2232A",
    tono2: "#B51B22",
    tono3: "#E8444A",
    tono4: "#C92A31",
    texto: "#FFFFFF",
    acento: "#FF3B4A",
  },
  green: {
    nombre: "THE GREEN EDITION",
    linea2: "FRUTA DEL DRAGÓN",
    tono1: "#3DAE2B",
    tono2: "#2F9420",
    tono3: "#5CC94A",
    tono4: "#41A830",
    texto: "#FFFFFF",
    acento: "#6BFF4F",
  },
  pomelo: {
    nombre: "THE POMELO EDITION",
    linea2: "SUGARFREE",
    tono1: "#F2728C",
    tono2: "#DE5D78",
    tono3: "#F78FA4",
    tono4: "#E9708A",
    texto: "#FFFFFF",
    acento: "#FF8FB0",
  },
  winter: {
    nombre: "THE WINTER EDITION",
    linea2: "VANILLA BERRY",
    tono1: "#A9D4EE",
    tono2: "#8EC0E2",
    tono3: "#6B5CA5",
    tono4: "#5A4C92",
    texto: "#3B2F78",
    acento: "#BFE6FF",
  },
};

export const FUENTE_TITULO = "Jost";
export const FUENTE_DEPORTE = "Barlow Condensed";

const archivos = [
  { family: FUENTE_TITULO, file: "jost-latin-800-normal.woff2", weight: "800", style: "normal" },
  { family: FUENTE_TITULO, file: "jost-latin-800-italic.woff2", weight: "800", style: "italic" },
  { family: FUENTE_TITULO, file: "jost-latin-900-normal.woff2", weight: "900", style: "normal" },
  { family: FUENTE_TITULO, file: "jost-latin-900-italic.woff2", weight: "900", style: "italic" },
  { family: FUENTE_DEPORTE, file: "barlow-condensed-latin-600-normal.woff2", weight: "600", style: "normal" },
  { family: FUENTE_DEPORTE, file: "barlow-condensed-latin-600-italic.woff2", weight: "600", style: "italic" },
  { family: FUENTE_DEPORTE, file: "barlow-condensed-latin-800-normal.woff2", weight: "800", style: "normal" },
  { family: FUENTE_DEPORTE, file: "barlow-condensed-latin-800-italic.woff2", weight: "800", style: "italic" },
] as const;

// Una sola promesa compartida: las texturas de las latas esperan a que las fuentes estén listas.
export const fuentesListas: Promise<void> =
  typeof document === "undefined"
    ? Promise.resolve()
    : Promise.all(
        archivos.map((f) =>
          loadFont({
            family: f.family,
            url: staticFile(`fonts/${f.file}`),
            weight: f.weight,
            style: f.style,
          }),
        ),
      ).then(() => undefined);
