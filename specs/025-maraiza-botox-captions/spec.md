# Feature Specification: Legendas Maraiza Botox 02

**Feature Branch**: `025-maraiza-botox-captions`
**Created**: 2026-08-14
**Status**: Ready
**Input**: Editar `maraiza-botox02` com legendas brancas, sombra leve e tag `PARAUAPEBAS E REGIÃO`, respeitando uma área central equivalente a 1080x1080.

## User Scenarios & Testing

### User Story 1 - Ler a fala com facilidade (Priority: P1)

Como espectador, quero acompanhar a fala por legendas claras sem perder de vista a personagem.

**Independent Test**: Assistir ao vídeo sem som e compreender a mensagem pela legenda.

**Acceptance Scenarios**:

1. **Given** o vídeo vertical, **When** a personagem fala, **Then** aparece uma legenda branca sincronizada, com sombra leve e no máximo duas linhas.
2. **Given** o enquadramento vertical, **When** a legenda aparece, **Then** ela permanece dentro da área quadrada central equivalente a 1080x1080.

### User Story 2 - Identificar a região atendida (Priority: P2)

Como espectador, quero identificar rapidamente a cidade e a região atendida.

**Independent Test**: Verificar a presença e a leitura da tag durante o vídeo.

**Acceptance Scenarios**:

1. **Given** qualquer momento do vídeo, **When** o quadro é exibido, **Then** a tag vermelha mostra exatamente `PARAUAPEBAS E REGIÃO` em branco dentro da área segura.

### Edge Cases

- Em enquadramentos mais fechados, legenda e tag não devem cobrir olhos, boca ou informações essenciais.
- A transcrição automática pode errar palavras; somente erros evidentes devem ser corrigidos sem alterar a fala.

## Requirements

### Functional Requirements

- **FR-001**: O vídeo final MUST preservar imagem, duração e áudio originais.
- **FR-002**: As legendas MUST ser brancas, com sombra leve, sincronizadas e divididas em blocos curtos de até duas linhas.
- **FR-007**: Cada legenda MUST ter entrada e saída animadas com desfoque, opacidade e pequeno deslocamento sincronizados.
- **FR-008**: Nenhuma legenda MUST antecipar palavras ainda não iniciadas na fala; frases longas devem ser divididas em blocos menores.
- **FR-009**: O MP4 final MUST usar compressão de qualidade visual máxima e preservar a resolução original.
- **FR-010**: A tag regional MUST ser maior e ficar mais alta que na primeira entrega, sem sair da área segura.
- **FR-003**: Legendas e tag MUST permanecer na área central de 1440x1440 do arquivo 1440x2560, equivalente à composição pedida de 1080x1080.
- **FR-004**: A tag MUST ter fundo vermelho e texto branco exatamente `PARAUAPEBAS E REGIÃO`.
- **FR-005**: A entrega final MUST ser MP4 e ficar em `Vídeo para editar/Videos Prontos/`.
- **FR-006**: O projeto editável e os materiais de QA MUST ficar fora da pasta de entregas.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% das falas entre o início e o fim da locução têm legenda legível.
- **SC-002**: Nenhum pixel da legenda ou da tag ultrapassa a faixa vertical Y=560 a Y=2000.
- **SC-003**: O MP4 final mantém 1440x2560, 30 fps, áudio audível e duração aproximada de 50,41 s.
- **SC-004**: A legenda `Nem preciso dizer que estou sem botox, né?` não aparece inteira antes da fala; ela é dividida e acompanha o início de cada trecho falado.
- **SC-005**: O arquivo final é renderizado em CRF 10 ou em um perfil de qualidade equivalente ou superior.
- **SC-006**: A legenda `Nem preciso` inicia exatamente em 6,00 segundos, correspondente ao frame 180 em 30 fps.

## Assumptions

- A tag permanece visível durante todo o vídeo.
- Não serão adicionados trilha, efeitos sonoros, cortes, transições ou outros elementos visuais.
