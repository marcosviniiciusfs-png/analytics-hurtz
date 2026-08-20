# Data Model: Fluxo gratuito assistido do Ideogram

## Slide

- `id`: identificador estável e único.
- `image`: imagem atual em data URL.
- `imageSource`: `manual` ou `generated`.
- `imageProvenance`: provedor, modelo, modo e nome do arquivo.
- `imageJobStatus`: `idle`, `pending`, `waiting-download`, `importing`, `completed`, `cancelled` ou `failed`.
- `visualScene`: cena física preparada para o slide.
- `visualAudit`: metadados do prompt e do fluxo.

## IdeogramWebSession

- `sessionId`: identificador único da espera.
- `slideId`: destino imutável da importação.
- `startedAt`: limite temporal dos arquivos candidatos.
- `prompt`: prompt efetivamente copiado.
- `state`: `preparing`, `waiting`, `importing`, `completed`, `cancelled` ou `failed`.
- `candidate`: nome, caminho seguro, tamanho, tipo e data de modificação.

## ImageQueue

- Derivada dos slides com `imageGenerationRequested`, elegíveis e sem `image`.
- Processada sequencialmente.
- Não inicia geração em background; apenas apresenta o próximo slide pendente.

## State transitions

```text
idle/pending -> preparing -> waiting-download -> importing -> completed
                                      |              |
                                      +-> cancelled  +-> failed
```

- Apagar o slide alvo cancela a sessão.
- Iniciar outra sessão cancela a anterior antes de criar a próxima.
- Seleção manual usa o mesmo estado `importing -> completed`.
