import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { Sonido } from "./Sonido";
import { Toma01Salto } from "./tomas/Toma01Salto";
import { Toma02LataClasica } from "./tomas/Toma02LataClasica";
import { Toma03InfiniteLines } from "./tomas/Toma03InfiniteLines";
import { Toma04LatasEsqui } from "./tomas/Toma04LatasEsqui";
import { Toma05HeavyMetal } from "./tomas/Toma05HeavyMetal";
import { Toma06Editions } from "./tomas/Toma06Editions";
import { Toma07NaturalSelection } from "./tomas/Toma07NaturalSelection";
import { Toma08WinterEdition } from "./tomas/Toma08WinterEdition";
import { Toma09Montaje } from "./tomas/Toma09Montaje";
import { Toma10Cierre } from "./tomas/Toma10Cierre";
import { ConFuentes } from "./ui/ConFuentes";

// Spot de 20 s: 10 tomas de 2 s que alternan NIEVE y LATAS.
export const RedBullNieveLatas: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ConFuentes>
        <Sequence name="1 · Nieve: salto frente al sol" durationInFrames={2 * fps}>
          <Toma01Salto />
        </Sequence>
        <Sequence name="2 · Lata: la nieve forma la clásica" from={2 * fps} durationInFrames={2 * fps}>
          <Toma02LataClasica />
        </Sequence>
        <Sequence name="3 · Nieve: Infinite Lines" from={4 * fps} durationInFrames={2 * fps}>
          <Toma03InfiniteLines />
        </Sequence>
        <Sequence name="4 · Latas: Sugarfree y Zero en el hielo" from={6 * fps} durationInFrames={2 * fps}>
          <Toma04LatasEsqui />
        </Sequence>
        <Sequence name="5 · Nieve: Heavy Metal" from={8 * fps} durationInFrames={2 * fps}>
          <Toma05HeavyMetal />
        </Sequence>
        <Sequence name="6 · Latas: Editions" from={10 * fps} durationInFrames={2 * fps}>
          <Toma06Editions />
        </Sequence>
        <Sequence name="7 · Nieve: Natural Selection" from={12 * fps} durationInFrames={2 * fps}>
          <Toma07NaturalSelection />
        </Sequence>
        <Sequence name="8 · Lata: Winter Edition" from={14 * fps} durationInFrames={2 * fps}>
          <Toma08WinterEdition />
        </Sequence>
        <Sequence name="9 · Nieve: montaje de eventos" from={16 * fps} durationInFrames={2 * fps}>
          <Toma09Montaje />
        </Sequence>
        <Sequence name="10 · Cierre: latas en la cima" from={18 * fps} durationInFrames={2 * fps}>
          <Toma10Cierre />
        </Sequence>
      </ConFuentes>
      <Sonido />
    </AbsoluteFill>
  );
};
