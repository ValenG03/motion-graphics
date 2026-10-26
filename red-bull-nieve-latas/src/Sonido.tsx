import { Audio } from "@remotion/media";
import React from "react";
import { interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { MARCAS, VIENTO } from "./sonido/marcas";

// Capa de sonido: música + viento + cada efecto en su cuadro.
// Todo el audio se generó con código (scripts/generar-audio.mjs).

const Viento: React.FC<{ readonly desde: number; readonly hasta: number; readonly volumen: number }> = ({ desde, hasta, volumen }) => {
  const frame = useCurrentFrame();
  const largo = hasta - desde;
  return (
    <Audio
      src={staticFile("audio/viento.wav")}
      trimBefore={desde}
      volume={interpolate(frame, [0, 6, largo - 6, largo], [0, volumen, volumen, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })}
    />
  );
};

export const Sonido: React.FC = () => {
  return (
    <>
      <Sequence name="Música" layout="none">
        <Audio src={staticFile("audio/musica.wav")} volume={0.82} />
      </Sequence>
      {VIENTO.map(([desde, hasta, volumen]) => (
        <Sequence key={`v${desde}`} name={`Viento ${desde / 30} s`} from={desde} durationInFrames={hasta - desde} layout="none">
          <Viento desde={desde} hasta={hasta} volumen={volumen} />
        </Sequence>
      ))}
      {MARCAS.map((m, i) => (
        <Sequence key={i} name={m.nombre} from={m.cuadro} layout="none">
          <Audio src={staticFile(`audio/${m.archivo}`)} volume={m.volumen} />
        </Sequence>
      ))}
    </>
  );
};
