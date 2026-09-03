# Implementation Plan: Projetos instantâneos e exclusão confiável

**Branch**: `018-dashboard-project-performance` | **Date**: 2026-08-13 | **Spec**: [spec.md](spec.md)

## Summary

Adicionar uma miniatura WebP/JPEG leve e persistente aos projetos, renderizar o dashboard sempre a partir do cache local e tornar a hidratação do Supabase progressiva. Centralizar confirmação, bloqueio de concorrência, remoção otimista e tombstones no `app.js`; o `supabase-sync.js` passa a oferecer apenas operações remotas por ID e deixa de sobrescrever eventos da interface.

## Technical Context

**Language/Version**: JavaScript, Electron 39  
**Storage**: localStorage para projetos/capas/tombstones; Supabase para persistência remota  
**Testing**: Node + Electron CDP, regressões estáticas e E2E existentes  
**Performance Goal**: card e capa local no primeiro render; nenhuma espera por todos os slides  
**Constraints**: preservar o editor, o formato dos projetos e a autenticação existentes

## Design Decisions

- A capa leve é uma imagem reduzida produzida em `requestIdleCallback`, nunca durante o primeiro render.
- O card usa `<img>` com `loading="eager"` e fundo de reserva, evitando o custo de uma data URL grande em `background-image`.
- A sincronização faz duas fases: metadados/capas locais primeiro, URLs assinadas depois.
- A exclusão é local-first. Um tombstone impede que uma resposta remota atrasada ressuscite o projeto.
- Eventos de interface permanecem no `app.js`; o Supabase expõe somente `deleteRemote` e `duplicateRemote`.

