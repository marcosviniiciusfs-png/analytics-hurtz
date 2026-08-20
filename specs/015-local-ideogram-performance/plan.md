# Implementation Plan: Ideogram 4 local com diagnóstico de desempenho

**Branch**: `015-local-ideogram-performance` | **Date**: 2026-08-13 | **Spec**: [spec.md](spec.md)

## Summary

Integrar o repositório oficial local por meio de um processo Python persistente, acrescentando um modo experimental de baixa VRAM para a RTX 4060 Ti de 8 GB. O processo recebe prompts JSON pela entrada padrão, mantém caches entre requisições, reporta eventos de carregamento/inferência e devolve a imagem e sua proveniência. O renderer apresenta modelo e diagnóstico fora de cada card.

## Technical Context

**Language/Version**: Electron/Node.js atual e Python 3.12
**Primary Dependencies**: ideogram-4, PyTorch CUDA, transformers, bitsandbytes, Hugging Face Hub
**Storage**: arquivos do motor em `ferramentas/ideogram4`, cache de pesos do Hugging Face e estado do projeto
**Testing**: testes Node de contrato/E2E, probe Python de hardware e teste real condicionado aos pesos gated
**Target Platform**: Windows 11, RTX 4060 Ti 8 GB, 32 GB RAM
**Project Type**: desktop-app com worker local de IA
**Performance Goals**: feedback em até 5 s; falha de pré-condição em até 15 s; uma geração por vez; editor responsivo
**Constraints**: pesos NF4 somam cerca de 15 GB; código oficial não implementa offload; modelo gated exige aceite e token Hugging Face; 80 GB livres no disco
**Scale/Scope**: filas de até 10 imagens, uso pessoal em uma máquina

## Constitution Check

A constituição é um template não preenchido. Aplicam-se as regras do AGENTS.md: especificação, plano, tarefas, implementação, análise e convergência obrigatórios. Gate aprovado.

## Research Decisions

1. Usar NF4 porque é a única variante oficial indicada para CUDA e é menor que FP8.
2. Usar `V4_TURBO_12` por padrão; o preset oficial de 48 etapas realiza quatro vezes mais passos.
3. Fixar o Diffusers no commit `04b197eece42bfc88d1814b20e07987d94cccaa7`, validado pelo ambiente oficial do Ideogram 4, com `transformers==5.8.0` e `accelerate==1.10.1`. Versões posteriores incompatíveis podem interpretar os tensores NF4 `qkv` como projeções separadas e invalidar os pesos durante a carga.
3. Não esconder a limitação de 8 GB: o status deve mostrar que o modo é de baixa VRAM e experimental.
4. Implementar worker persistente, evitando iniciar Python e recarregar todos os pesos a cada slide.
5. Separar preparação, carregamento, inferência, auditoria e persistência nos eventos de progresso.
6. Manter FLUX local como fallback quando os pesos gated não estiverem disponíveis ou o probe reprovar.
7. Persistir o modelo realmente usado após o retorno do backend, nunca o modelo apenas solicitado.

## Project Structure

```text
Hurtz Flow Studio/
├── main.js
├── preload.js
├── app.js
├── editor-v2.css
├── scripts/
│   ├── ideogram-local-worker.py
│   ├── ideogram-local-probe.py
│   ├── ideogram-local-contract-test.js
│   └── image-provenance-e2e-test.js
ferramentas/
└── ideogram4/
specs/015-local-ideogram-performance/
├── spec.md
├── plan.md
└── tasks.md
```

**Structure Decision**: manter a aplicação Electron existente e isolar o runtime pesado em um worker Python local persistente.

## Complexity Tracking

| Complexity | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Offload sequencial experimental | Os pesos ativos excedem os 8 GB de VRAM | O pipeline oficial encerra por falta de memória |
| Processo persistente | Carregar 15 GB para cada slide dominaria o tempo total | Um CLI descartável repetiria o maior gargalo |
