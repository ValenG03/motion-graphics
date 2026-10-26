import { Composition, Folder } from "remotion";
import { PruebaLata } from "./pruebas/PruebaLata";
import { RedBullNieveLatas } from "./RedBullNieveLatas";
import { Toma01Salto } from "./tomas/Toma01Salto";
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
      </Folder>
      <Folder name="Pruebas">
        <Composition id="PruebaLata" component={PruebaLata} durationInFrames={120} fps={30} width={1920} height={1080} />
      </Folder>
    </>
  );
};
