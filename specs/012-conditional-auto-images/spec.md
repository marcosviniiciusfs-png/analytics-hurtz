# Especificação: Geração automática condicional de imagens

## Cenários do usuário

Ao criar um carrossel e escolher um modo com imagens, o usuário entra no editor imediatamente e acompanha a geração automática em segundo plano. Ao escolher “Sem imagens” ou “Texturas”, nenhuma imagem é gerada.

## Requisitos funcionais

- **FR-001**: A geração automática só pode iniciar após escolha explícita de Fundo, Grade ou Intercalado.
- **FR-002**: Sem imagens e Texturas não podem disparar o gerador.
- **FR-003**: Cada slide deve receber um briefing derivado da própria copy, função narrativa e direção visual informada.
- **FR-004**: A direção visual deve ser anexada obrigatoriamente a cada solicitação.
- **FR-005**: A fila deve processar até duas imagens simultaneamente para reduzir o tempo sem saturar o computador.
- **FR-006**: O editor deve abrir antes da conclusão e exibir progresso real.
- **FR-007**: Trocar de janela não pode iniciar uma fila não solicitada nem cancelar uma fila solicitada.
- **FR-008**: Falhas individuais não podem apagar copy nem bloquear o carrossel.
- **FR-009**: A geração manual de um slide deve continuar disponível.

## Critérios de sucesso

- Modos sem imagem fazem zero chamadas ao gerador.
- Modos com imagem geram exatamente os slides elegíveis.
- Concorrência máxima observada é dois.
- Todo prompt contém direção visual e copy específica do slide.

## Premissas

- O provedor configurado continua com fallback para FLUX local.
