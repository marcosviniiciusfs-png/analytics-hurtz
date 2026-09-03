# Especificação: Texto nítido no editor

## Cenário do usuário

Ao editar ou visualizar um slide, o usuário deve enxergar títulos, textos, badges, CTA e textos dos cantos com contornos nítidos, sem desfoque causado pela pré-visualização. A fluidez e o isolamento entre ferramentas devem permanecer.

## Requisitos funcionais

- **FR-001**: A camada que contém tipografia deve ser rasterizada na resolução nativa do slide.
- **FR-002**: Fundo, overlay e guias podem usar superfícies reduzidas durante interações contínuas quando isso não prejudicar a legibilidade.
- **FR-003**: A composição final da pré-visualização não deve ampliar uma camada tipográfica de baixa resolução.
- **FR-004**: O isolamento entre ferramentas implementado anteriormente deve ser preservado.
- **FR-005**: Exportações devem permanecer em 1080×1350 e não sofrer alteração de qualidade.
- **FR-006**: O teste visual deve comprovar ganho mensurável de definição nas bordas dos caracteres.

## Critérios de sucesso

- A superfície de conteúdo possui 1080×1350 pixels.
- A alteração de texto repinta somente conteúdo.
- A alteração de overlay repinta somente overlay.
- Testes de regressão e de nitidez passam.

## Premissas

- O defeito é causado pela ampliação de uma camada tipográfica de 324×405 para 1080×1350.
