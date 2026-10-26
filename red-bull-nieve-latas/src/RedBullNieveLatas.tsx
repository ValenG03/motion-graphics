import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { Toma01Salto } from "./tomas/Toma01Salto";
import { ConFuentes } from "./ui/ConFuentes";

// Spot de 20 s: 10 tomas de 2 s que alternan NIEVE y LATAS.
export const RedBullNieveLatas: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ConFuentes>
        <Sequence name="1 · Nieve: salto frente al sol" from={0} durationInFrames={2 * fps}>
          <Toma01Salto />
        </Sequence>
      </ConFuentes>
    </AbsoluteFill>
  );
};
