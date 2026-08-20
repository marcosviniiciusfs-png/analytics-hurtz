# Contract: geração isolada e formatos

## Entrada da geração

```text
generateCarouselAI({
  topic,
  count,
  tone,
  format,
  generateImages,
  imageStyle,
  reference,
  composition
})
```

### Guarantees

1. O contexto é capturado antes de qualquer `await`.
2. `format` é normalizado e não pode ser substituído por seleção anterior.
3. Toda chamada criativa principal é vinculada ao identificador atual.
4. Uma resposta de execução antiga não altera `state`.
5. Copy explícita segue o contrato de preservação já existente.

## Política de cache

```text
requestCopy(prompt, reference, {
  cache: "bypass" | "validated",
  generationId,
  purpose
})
```

- `bypass`: geração, humanização, recuperação e reparo de copy.
- `validated`: auditorias ou operações idempotentes; exige igualdade integral de prompt, modelo e versão.

## Saída de formato

Cada slide deve expor a assinatura coerente com o formato:

- Minimalista: `format=minimalista`, variantes `minimalVariant`.
- Profile: `format=profile`, `template=profile`, variantes `profileVariant`, badge.
- Creators: `format=creators`, variantes `creatorVariant` e alternância tipográfica.
- TechViral: `format=techviral`, variantes `techVariant` e padrões técnicos.
- Infinito: `format=infinite`, `template=infinite`, `smartLayout=seamless` e índice contínuo.

Reparos e auditorias não podem mudar essa assinatura.
