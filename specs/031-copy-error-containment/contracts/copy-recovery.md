# Contract: Recuperação segura de copy

## Entrada

- Assunto original não vazio.
- Quantidade de slides válida.
- Tom, formato e persona.
- Código neutro da falha, quando houver.
- Candidato anterior apenas quando ele não contiver diagnóstico interno.

## Saída aprovada

```json
{
  "slides": [
    { "title": "", "body": "", "role": "hook|body|cta" }
  ],
  "caption": "",
  "hashtags": "",
  "recoveryReport": {
    "code": "model_empty",
    "attempts": 1,
    "fallbackApplied": false,
    "diagnosticLeakRejected": false
  }
}
```

## Invariantes

- A quantidade de slides deve ser exata.
- O primeiro slide é Hook e o último contém CTA.
- A copy mantém o assunto original.
- Nenhum diagnóstico interno ausente do pedido pode aparecer.
- Mensagens técnicas nunca são usadas como assunto, slide, legenda ou direção visual.
