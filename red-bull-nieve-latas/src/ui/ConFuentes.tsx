import React, { useEffect, useState } from "react";
import { useDelayRender } from "remotion";
import { fuentesListas } from "../marca";

// Muestra el contenido recién cuando las tipografías están cargadas.
// Así las etiquetas de las latas (que llevan texto) se dibujan con la letra correcta
// antes de que la escena 3D pinte su primer cuadro.
export const ConFuentes: React.FC<{ readonly children: React.ReactNode }> = ({ children }) => {
  const [listas, setListas] = useState(false);
  const { delayRender, continueRender } = useDelayRender();
  const [espera] = useState(() => delayRender("Cargando tipografías"));
  useEffect(() => {
    let vivo = true;
    fuentesListas.then(() => {
      if (vivo) setListas(true);
    });
    return () => {
      vivo = false;
    };
  }, []);
  // Se libera el render recién después de que React dibujó el contenido.
  useEffect(() => {
    if (listas) continueRender(espera);
  }, [listas, continueRender, espera]);
  return listas ? <>{children}</> : null;
};
