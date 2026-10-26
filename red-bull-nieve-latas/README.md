# Red Bull · Nieve + Latas (spot de 20 s)

Spot animado hecho con [Remotion](https://www.remotion.dev) y `@remotion/three` (Three.js) que fusiona los eventos de esquí y snowboard de Red Bull con sus latas. Es una pieza de práctica/portfolio: el logo y las latas son marcas registradas de Red Bull.

- 1920 × 1080, 30 fps, 20 s (600 cuadros)
- 10 tomas de 2 s que alternan **nieve** y **latas**
- Música y efectos de sonido **generados con código** (sin archivos descargados)

## Las 10 tomas

| Tiempo | Tema | Qué pasa |
|---|---|---|
| 0–2 s | Nieve | Picada sobre la montaña, salto frente al sol, golpea "RED BULL TE DA ALAS" |
| 2–4 s | Lata | La nieve de la tabla forma la lata clásica: gira con gotas y escarcha, "pssst" |
| 4–6 s | Nieve | Red Bull Infinite Lines (Avoriaz): mortal en cámara lenta con órbita |
| 6–8 s | Latas | Sugarfree y Zero se deslizan como esquís sobre un lago congelado |
| 8–10 s | Nieve | Red Bull Heavy Metal: boardslide en una baranda de la ciudad de noche |
| 10–12 s | Latas | Abanico de Editions (Red, Green, Pomelo) que explotan en su color |
| 12–14 s | Nieve | Natural Selection (Revelstoke): dron sigue un giro en polvo |
| 14–16 s | Lata | Winter Edition (Vanilla Berry) se congela y el hielo estalla |
| 16–18 s | Nieve | Montaje rápido de los 3 eventos + riser |
| 18–20 s | Cierre | Las latas en la cima, logo con el sol y "RED BULL TE DA AAALAS" |

## Comandos

```bash
npm i                 # instalar dependencias
npm run dev           # vista previa en Remotion Studio
npm run audio         # regenerar música y efectos (public/audio/)
npm run render:final  # render final con motion blur → Renders/red-bull-nieve-latas.mp4
```

En una máquina sin placa de video: `GL=swangle npm run render:final`.

## Cómo está armado

- `src/RedBullNieveLatas.tsx`: la composición completa (10 tomas + sonido).
- `src/tomas/`: una carpeta por toma; cada una también está registrada sola en Studio (carpeta "Tomas").
- `src/three/`: el kit 3D: `Lata` (texturas procedurales de las 7 latas), `Terreno`, `Atleta` (rider articulado con cinemática inversa), `Cielo` + sol, partículas, hielo espejado, ciudad.
- `src/ui/`: efectos 2D: título con impacto, rótulos de eventos, flashes, destellos de lente, copos en primer plano, logo.
- `src/tiempo.ts`: *speed ramps* (cámara lenta y aceleraciones) y el desfase de obturador para el motion blur.
- `src/sonido/marcas.ts`: en qué cuadro suena cada efecto.
- `scripts/generar-audio.mjs`: sintetizador (bombo, clap, hats, bajo con sidechain, supersaw, arpegio, whooshes, crujido de nieve, viento, "pssst", burbujas, hielo, riser, impactos).
- `scripts/render-final.sh`: renderiza 4 pasadas con distinto obturador y las promedia con ffmpeg (motion blur real), normaliza el audio a −14 LUFS y codifica H.264 + AAC.

## Marca (referencias usadas)

- Colores: azul `#223971`, azul profundo `#121F45`, plateado `#C0BFBF`, rojo `#E21B4D`, amarillo sol `#FFD300`.
- Tipografías gratuitas: **Jost** (parecida a Futura, base del logotipo) y **Barlow Condensed**.
- Tono rioplatense de la web argentina: "Red Bull te da aaalas", "Aaalas para todos los gustos".
