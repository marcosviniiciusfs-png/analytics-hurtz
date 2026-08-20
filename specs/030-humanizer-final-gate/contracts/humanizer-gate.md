# Contract: Humanizer final gate

## Analyze

Entrada: carrossel com `slides`, `caption` e modo de copy.

Saída: relatório com aprovação e ocorrências localizadas. A análise não modifica o conteúdo.

## Repair prompt

Entrada: copy atual, problemas detectados, assunto, tom e persona.

Saída esperada: JSON no mesmo formato, preservando quantidade, papéis, fatos, intenção e CTA.

## Safe cleanup

Entrada: copy gerada reprovada após falha ou resposta inválida.

Saída: nova copy com apenas transformações determinísticas seguras. Hífens ortográficos permanecem.

## Protected mode

Quando o modo é `exact` ou `preserved`, o conteúdo é devolvido sem análise corretiva e o relatório registra `protected: true`.
