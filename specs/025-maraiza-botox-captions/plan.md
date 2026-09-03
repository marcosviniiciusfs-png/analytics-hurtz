# Implementation Plan: Legendas Maraiza Botox 02

**Branch**: `025-maraiza-botox-captions` | **Date**: 2026-08-14 | **Spec**: `spec.md`

## Summary

Compor o vídeo original em Remotion, preservando o áudio, com legendas temporizadas e tag regional dentro da área quadrada central. As legendas adaptam a receita `blur-slide` da `video-shotcraft`: palavras entram com opacidade, subida curta e blur convergindo pela mesma curva; a saída inverte os canais. O master MP4 será renderizado em CRF 10.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19
**Primary Dependencies**: Remotion 4.0.503
**Storage**: Arquivos locais
**Testing**: TypeScript, render de frames, ffprobe e inspeção visual
**Target Platform**: MP4 vertical 1440x2560 a 30 fps
**Project Type**: Projeto audiovisual Remotion
**Performance Goals**: Render determinístico da composição completa com compressão visual de qualidade máxima
**Constraints**: Conteúdo informativo limitado à faixa Y=560..2000; sem novas camadas de som
**Scale/Scope**: Um vídeo de 50,41 s, uma tag e legendas de fala

## Constitution Check

A constituição do Spec Kit está em formato de template. Aplicam-se as regras do AGENTS.md: Spec Kit completo, `video-shotcraft` exclusiva e entrega final isolada.

## Project Structure

```text
Vídeo para editar/maraiza-botox02-remotion/
├── public/maraiza-botox02.mp4
├── src/
│   ├── Caption.tsx
│   ├── captions.ts
│   ├── Composition.tsx
│   ├── Root.tsx
│   └── index.ts
└── package.json
```

**Structure Decision**: Projeto Remotion independente, com apenas o componente da `video-shotcraft` efetivamente adaptado.
