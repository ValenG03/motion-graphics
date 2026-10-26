import { Composition, Folder } from "remotion";
import { PruebaLata } from "./pruebas/PruebaLata";
import { RedBullNieveLatas } from "./RedBullNieveLatas";
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
      {/* Solo la capa de audio: se usa para exportar el sonido rápido, sin dibujar el 3D */}
      <Composition id="SoloSonido" component={Sonido} durationInFrames={600} fps={30} width={1920} height={1080} />
      <Folder name="Tomas">
        <Composition id="Toma01" component={conFuentes(Toma01Salto)} durationInFrames={60} fps={30} width={1920} height={1080} />
        <Composition id="Toma02" component={conFuentes(Toma02LataClasica)} durationInFrames={60} fps={30} width={1920} height={1080} />
        <Composition id="Toma03" component={conFuentes(Toma03InfiniteLines)} durationInFrames={60} fps={30} width={1920} height={1080} />
        <Composition id="Toma04" component={conFuentes(Toma04LatasEsqui)} durationInFrames={60} fps={30} width={1920} height={1080} />
        <Composition id="Toma05" component={conFuentes(Toma05HeavyMetal)} durationInFrames={60} fps={30} width={1920} height={1080} />
        <Composition id="Toma06" component={conFuentes(Toma06Editions)} durationInFrames={60} fps={30} width={1920} height={1080} />
        <Composition id="Toma07" component={conFuentes(Toma07NaturalSelection)} durationInFrames={60} fps={30} width={1920} height={1080} />
        <Composition id="Toma08" component={conFuentes(Toma08WinterEdition)} durationInFrames={60} fps={30} width={1920} height={1080} />
        <Composition id="Toma09" component={conFuentes(Toma09Montaje)} durationInFrames={60} fps={30} width={1920} height={1080} />
        <Composition id="Toma10" component={conFuentes(Toma10Cierre)} durationInFrames={60} fps={30} width={1920} height={1080} />
      </Folder>
      <Folder name="Pruebas">
        <Composition id="PruebaLata" component={PruebaLata} durationInFrames={120} fps={30} width={1920} height={1080} />
      </Folder>
    </>
  );
};
