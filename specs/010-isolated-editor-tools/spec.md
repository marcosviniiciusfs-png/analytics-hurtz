# Especificação: Ferramentas isoladas do editor

## Cenários do usuário

Ao alterar uma ferramenta, somente a camada relacionada é recalculada. As outras partes do card permanecem intactas e não piscam. Ao concluir a interação, a alteração é salva e as visualizações secundárias são atualizadas sem bloquear o editor.

## Requisitos funcionais

- **FR-001**: Fundo e imagem pertencem a uma camada independente.
- **FR-002**: Sombra/overlay pertence a uma camada independente, acima da imagem e abaixo do conteúdo.
- **FR-003**: Título, texto, badge, CTA e cantos pertencem à camada de conteúdo.
- **FR-004**: Grade e guias pertencem a uma camada independente.
- **FR-005**: Cada ferramenta invalida somente sua camada de destino.
- **FR-006**: Alterações contínuas não recriam miniaturas nem salvam a cada movimento.
- **FR-007**: Ao concluir a interação, o estado é salvo e as visualizações secundárias são atualizadas fora do caminho crítico.
- **FR-008**: Troca de slide, formato ou estrutura reconstrói todas as camadas.
- **FR-009**: Exportação continua usando a composição completa em resolução final.

## Critérios de sucesso

- Alterar overlay executa zero repinturas de fundo e conteúdo.
- Alterar tipografia executa zero repinturas de fundo e overlay.
- Nenhuma interação contínua salva ou recria miniaturas antes de terminar.
- Todos os testes existentes e os novos testes de isolamento passam.

## Premissas

- A ordem visual é fundo/imagem, overlay, conteúdo e guias.
- Mudanças estruturais podem invalidar a composição completa.
