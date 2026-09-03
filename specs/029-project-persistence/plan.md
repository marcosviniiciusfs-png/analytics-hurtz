# Implementation Plan: Persistência integral dos projetos

**Branch**: `029-project-persistence` | **Date**: 2026-08-14 | **Spec**: `specs/029-project-persistence/spec.md`

## Summary

Adicionar armazenamento versionado e atômico no processo principal do Electron. O renderer restaura esse armazenamento antes de carregar o editor, espelha cada alteração do projeto salvo e faz flush síncrono no fechamento. Abrir um projeto passa a ser restauração passiva: não invalida imagens, não reescreve copy e não retoma jobs antigos. O Supabase permanece como réplica assíncrona.

## Technical Context

**Language/Version**: JavaScript (Electron 39 / Node.js)

**Primary Dependencies**: Electron, Supabase REST, Playwright

**Storage**: JSON atômico em `userData`, imagens em `project-images`, localStorage como espelho e Supabase como réplica

**Testing**: Playwright + Electron, smoke tests Node

**Target Platform**: Windows 10/11 desktop

**Project Type**: Aplicativo desktop Electron

**Performance Goals**: Dashboard em até 2 s; restauração exata em 10/10 ciclos

**Constraints**: Sem regeneração implícita; compatibilidade com registros existentes; funcionamento offline

**Scale/Scope**: Projetos locais com até 10 slides e mídias por arquivo, URL ou data URL

## Constitution Check

- Spec e testes de ciclo completo antes da entrega: PASS.
- Persistência local não depende de rede: PASS.
- Escrita atômica e versão monotônica: PASS.
- Mudança limitada ao ciclo de persistência/restauração: PASS.

## Project Structure

```text
specs/029-project-persistence/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/project-store.md
└── tasks.md

Hurtz Flow Studio/
├── main.js
├── preload.js
├── project-persistence-bootstrap.js
├── project-persistence.js
├── app.js
├── supabase-sync.js
├── index.html
└── tests/project-persistence.spec.js
```

**Structure Decision**: O processo principal é o único escritor do arquivo durável; um bootstrap restaura o espelho antes de `app.js`; um módulo final integra autosave, botão explícito e bloqueio de regeneração na restauração.

## Complexity Tracking

Nenhuma violação ou camada fora do necessário para persistência durável.
