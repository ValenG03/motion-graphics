#!/usr/bin/env bash
# Render final del spot con motion blur por acumulación.
#
# Cómo funciona (en criollo): se renderiza el video varias veces, cada vez corriendo el
# tiempo una fracción de cuadro (el "obturador" de la cámara). Después ffmpeg promedia
# las pasadas: lo que se mueve rápido queda con estela, como en una cámara de cine.
#
# Uso:  npm run render:final
# Variables opcionales: PASADAS (4), CONCURRENCIA (3), GL (angle; en servidores sin GPU: swangle),
#                       NAVEGADOR (ruta a un Chrome/Chromium para --browser-executable)
set -euo pipefail
cd "$(dirname "$0")/.."

PASADAS=${PASADAS:-4}
CONC=${CONCURRENCIA:-3}
GL=${GL:-angle}
TMP=out/pasadas
SALIDA=Renders/red-bull-nieve-latas.mp4
NAV_ARG=()
if [ -n "${NAVEGADOR:-}" ]; then NAV_ARG=(--browser-executable="$NAVEGADOR"); fi

mkdir -p "$TMP" Renders
rm -rf "$TMP/bundle"
echo "▶ Empaquetando el proyecto..."
npx remotion bundle --out-dir="$TMP/bundle" > /dev/null

for i in $(seq 0 $((PASADAS - 1))); do
  # Obturador de 180°: las pasadas se reparten en medio cuadro.
  OBT=$(awk "BEGIN { printf \"%.4f\", $i / $PASADAS * 0.5 }")
  if [ -f "$TMP/pasada-$i.mov" ]; then
    echo "▶ Pasada $((i + 1))/$PASADAS ya existe, la reutilizo."
    continue
  fi
  echo "▶ Pasada $((i + 1))/$PASADAS (obturador $OBT)..."
  npx remotion render "$TMP/bundle" RedBullNieveLatas "$TMP/pasada-$i.mov" \
    --codec=prores --prores-profile=hq --muted \
    --props="{\"obturador\":$OBT}" \
    --concurrency="$CONC" --timeout=300000 --gl="$GL" "${NAV_ARG[@]}"
done

echo "▶ Audio..."
npx remotion render "$TMP/bundle" RedBullNieveLatas "$TMP/audio.wav" --codec=wav \
  --concurrency="$CONC" --timeout=300000 --gl="$GL" "${NAV_ARG[@]}"

echo "▶ Promediando pasadas y codificando MP4 (H.264 + AAC)..."
ENTRADAS=()
MEZCLA=""
for i in $(seq 0 $((PASADAS - 1))); do
  ENTRADAS+=(-i "$TMP/pasada-$i.mov")
  MEZCLA+="[$i:v]"
done
ffmpeg -y -v warning -stats "${ENTRADAS[@]}" -i "$TMP/audio.wav" \
  -filter_complex "${MEZCLA}mix=inputs=$PASADAS[v];[$PASADAS:a]loudnorm=I=-14:TP=-1:LRA=9[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset slow -crf 14 -profile:v high -pix_fmt yuv420p -tune film \
  -c:a aac -b:a 320k -ar 48000 \
  -movflags +faststart "$SALIDA"

echo "✔ Listo: $SALIDA"
