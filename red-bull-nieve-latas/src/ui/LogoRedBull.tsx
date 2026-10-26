import React from "react";
import { COLORES, FUENTE_TITULO } from "../marca";
import { EMBLEMA, PATH_TORO, SOL, TORO_DER, TORO_IZQ } from "../logo";

type Props = {
  readonly ancho: number;
  // 0 a 1: aparición de cada parte (sol, toros, texto).
  readonly sol?: number;
  readonly toros?: number;
  readonly texto?: number;
  readonly brilloSol?: number;
};

export const LogoRedBull: React.FC<Props> = ({
  ancho,
  sol = 1,
  toros = 1,
  texto = 1,
  brilloSol = 0,
}) => {
  const alto = (ancho / EMBLEMA.ancho) * (EMBLEMA.alto + 92);
  const empuje = (1 - toros) * 120;
  return (
    <svg
      width={ancho}
      height={alto}
      viewBox={`0 0 ${EMBLEMA.ancho} ${EMBLEMA.alto + 92}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id="halo-sol">
          <stop offset="0%" stopColor={COLORES.amarillo} stopOpacity={0.9} />
          <stop offset="45%" stopColor={COLORES.oro} stopOpacity={0.35} />
          <stop offset="100%" stopColor={COLORES.oro} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle
        cx={SOL.x}
        cy={SOL.y}
        r={SOL.r * (1.6 + brilloSol * 1.6)}
        fill="url(#halo-sol)"
        opacity={brilloSol * sol}
      />
      <circle
        cx={SOL.x}
        cy={SOL.y}
        r={SOL.r * sol}
        fill={COLORES.amarillo}
      />
      <g opacity={Math.min(1, toros * 1.5)}>
        <path
          d={PATH_TORO}
          fill={COLORES.rojo}
          transform={`translate(${TORO_IZQ.x - empuje} ${TORO_IZQ.y}) scale(${TORO_IZQ.escala})`}
        />
        <path
          d={PATH_TORO}
          fill={COLORES.rojo}
          transform={`translate(${TORO_DER.x + empuje} ${TORO_DER.y}) scale(${-TORO_DER.escala} ${TORO_DER.escala})`}
        />
      </g>
      <text
        x={EMBLEMA.ancho / 2}
        y={EMBLEMA.alto + 70}
        textAnchor="middle"
        fontFamily={FUENTE_TITULO}
        fontWeight={900}
        fontSize={92}
        letterSpacing={-1}
        fill={COLORES.rojo}
        opacity={texto}
        style={{ paintOrder: "stroke" }}
        stroke="#ffffff"
        strokeWidth={texto > 0 ? 3 : 0}
      >
        Red Bull
      </text>
    </svg>
  );
};
