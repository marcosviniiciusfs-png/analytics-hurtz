# Vídeo Integra — projeto editável em Remotion

Composição principal: `IntegraEditado`

## Abrir o editor

```powershell
npm install
npm run dev
```

## Renderizar novamente

```powershell
npx remotion render src/index.ts IntegraEditado "..\Vídeo-para-editar-FINAL.mp4" --codec=h264 --crf=18 --audio-bitrate=192k
```

## Arquivos principais

- `src/Composition.tsx`: vídeo, cards, animações, zooms, cortes e efeitos sonoros.
- `src/CaptionLayer.tsx`: legendas dinâmicas e destaque da palavra falada.
- `public/captions.json`: texto e sincronização das legendas.
- `public/source.mp4`: vídeo original usado pela composição.
- `scripts/transcribe.mjs`: transcrição local com Whisper.cpp.

O projeto usa 1440×2560, 30 fps e 744 frames.
