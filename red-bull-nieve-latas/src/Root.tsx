import { Composition, Folder } from "remotion";
import { PruebaLata } from "./pruebas/PruebaLata";
import { RedBullNieveLatas } from "./RedBullNieveLatas";
import { Toma01Salto } from "./tomas/Toma01Salto";
import { Toma02LataClasica } from "./tomas/Toma02LataClasica";
import { Toma03InfiniteLines } from "./tomas/Toma03InfiniteLines";
import { Toma04LatasEsqui } from "./tomas/Toma04LatasEsqui";
import { Toma05HeavyMetal } from "./tomas/Toma05HeavyMetal";
import { Toma06Editions } from "./tomas/Toma06Editions";
import { ConFuentes } from "./ui/ConFuentes";

const conFuentes = (C: React.FC) => {
  const Envuelto: React.FC = () => (
    <ConFuentes>
      <C />
    </ConFuentes>
  );
  return Envuelto;
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="RedBullNieveLatas"
        component={RedBullNieveLatas}
        durationInFrames={600}
        fps={30}
        width={1920}
        height={1080}
      />
      <Folder name="Tomas">
        <Composition id="Toma01" component={conFuentes(Toma01Salto)} durationInFrames={60} fps={30} width={1920} height={1080} />
        <Composition id="Toma02" component={conFuentes(Toma02LataClasica)} durationInFrames={60} fps={30} width={1920} height={1080} />
        <Composition id="Toma03" component={conFuentes(Toma03InfiniteLines)} durationInFrames={60} fps={30} width={1920} height={1080} />
        <Composition id="Toma04" component={conFuentes(Toma04LatasEsqui)} durationInFrames={60} fps={30} width={1920} height={1080} />
        <Composition id="Toma05" component={conFuentes(Toma05HeavyMetal)} durationInFrames={60} fps={30} width={1920} height={1080} />
        <Composition id="Toma06" component={conFuentes(Toma06Editions)} durationInFrames={60} fps={30} width={1920} height={1080} />
      </Folder>
      <Folder name="Pruebas">
        <Composition id="PruebaLata" component={PruebaLata} durationInFrames={120} fps={30} width={1920} height={1080} />
      </Folder>
    </>
  );
};
