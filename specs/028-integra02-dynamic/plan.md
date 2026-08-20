# Plano: Integra 02 dinâmico

## Arquitetura

- Remotion + React + TypeScript.
- Composição 1440×2360, 30 fps, 1327 quadros.
- Fonte copiada para `public/` do projeto editável.
- SFX copiados individualmente da video-shotcraft e mixados explicitamente no master final.

## Componentes

- `CityTag`: tag fixa dentro da área segura.
- `DynamicCaption`: legenda por palavras com blur-slide.
- `TaxHook`: gancho lateral sem tocar o rosto.
- `PlanningTitle`: título de planejamento tributário.
- `FactorList`: adaptação do `list-reveal`.
- `StrategicFlip`: adaptação do `card-flip-reveal`.
- `FinalCTA`: encerramento em tela cheia.

## Validação

- Typecheck.
- Stills de cada cena principal.
- Inspeção quadro a quadro das emendas.
- Render H.264 CRF 5 e áudio AAC 320 kb/s.
- Decodificação completa, contagem de quadros, loudness e true peak.
- Revisão independente em contexto limpo.
