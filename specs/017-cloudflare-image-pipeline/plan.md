# Implementation Plan: Pipeline gratuito de imagens Cloudflare

**Branch**: `017-cloudflare-image-pipeline` | **Date**: 2026-08-13 | **Spec**: [spec.md](spec.md)

## Summary

Adicionar um serviço Node isolado no processo principal do Electron para autenticação, geração REST multipart/JSON, fallback e cache. O renderer continua responsável pelo planejamento visual e pelas auditorias existentes, mas passa a consumir um único contrato IPC e atualizar somente o slide alvo. A interface de configuração usa um painel próprio, estados acessíveis, credenciais protegidas e ações independentes.

## Technical Context

**Language/Version**: JavaScript, Electron 39, Node.js embarcado
**Primary Dependencies**: Electron IPC, Fetch/FormData nativos, Crypto, filesystem, Tesseract já instalado
**Storage**: credencial criptografada em userData e cache local limitado
**Testing**: testes Node com fetch simulado, contratos estáticos, suíte E2E existente
**Target Platform**: Windows 11 desktop
**Performance Goals**: uma chamada ativa; cache abaixo de 150 itens; nenhum trabalho de rede ou disco pesado no renderer
**Constraints**: preservar editor e projetos existentes; nenhum segredo no renderer; fallback finito; sem dependência nova

## Constitution Check

A constituição é um template sem princípios ratificados. O fluxo obrigatório do AGENTS.md foi aplicado. A UI traduz os padrões shadcn de Field, Alert, Badge, Progress e Button para os componentes HTML/CSS nativos já existentes.

## Project Structure

```text
Hurtz Flow Studio/
├── cloudflare-image-service.js
├── main.js
├── preload.js
├── app.js
├── product-ui.css
├── package.json
└── scripts/
    ├── cloudflare-image-service-test.js
    └── cloudflare-image-pipeline-e2e-test.js
```

## Design Decisions

- Klein usa multipart conforme o contrato oficial; Schnell usa JSON.
- O serviço normaliza respostas e valida magic bytes antes de criar data URL.
- Cache usa hash de versão, modelo, prompt e dimensões; variações manuais podem ignorá-lo.
- Erros de autenticação não acionam fallback; falhas transitórias/modelo podem acionar uma tentativa Schnell.
- A fila usa IDs estáveis e faz auditoria antes de persistir o resultado.
- O salvamento seguro do Cloudflare possui um contrato próprio e não pode ser sobrescrito pelo salvamento genérico ou pela sincronização Supabase; a sincronização de preferências é executada somente depois da persistência local.
