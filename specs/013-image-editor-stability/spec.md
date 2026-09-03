# Especificação: estabilidade da geração e do editor

## Cenários do usuário

### US1 — Gerar todas as imagens solicitadas (P1)
Quando o usuário cria um carrossel com imagens, a geração começa automaticamente, exibe progresso real e termina com uma imagem utilizável em cada slide elegível. Falhas transitórias devem ser tentadas novamente sem bloquear o editor.

### US2 — Editar enquanto as imagens são geradas (P1)
O usuário pode abrir grupos, mover seletores, alterar cor, texto, overlay e imagens enquanto a fila trabalha, sem travamentos perceptíveis de toda a janela.

### US3 — Entender e recuperar falhas (P2)
Se um provedor falhar, o sistema usa o fallback disponível, registra a causa por slide e oferece nova tentativa somente para itens pendentes.

## Requisitos funcionais
- **FR-001** A geração automática deve processar apenas slides elegíveis e completar todos os itens solicitados.
- **FR-002** O modelo principal configurado deve existir e o fallback deve ser validado antes da fila.
- **FR-003** Cada slide deve preservar a direção visual e a sua copy no prompt.
- **FR-004** A fila deve limitar concorrência e uso de memória, liberar recursos entre itens e evitar auditorias redundantes no caminho crítico.
- **FR-005** Uma imagem válida deve ser exibida mesmo quando a auditoria semântica estiver indisponível; apenas defeitos objetivos devem impedir seu uso.
- **FR-006** Estado, progresso, erro e nova tentativa devem ser persistidos por slide.
- **FR-007** Controles do menu lateral devem atualizar apenas a camada afetada e não serializar/renderizar o carrossel inteiro durante arraste.
- **FR-008** Persistência e miniaturas devem ocorrer após confirmação do controle, em lote e fora do quadro interativo.
- **FR-009** O editor deve continuar responsivo durante geração, auditoria, salvamento e atualização de miniaturas.

## Casos extremos
- Chave Gemini inválida, expirada, sem cota ou sem acesso ao modelo.
- FLUX ausente, caminho salvo desatualizado ou GPU sem memória.
- Uma imagem falha enquanto outras concluem.
- Usuário troca de tela, minimiza ou volta ao aplicativo durante a fila.
- Projeto contém imagens grandes em base64 e vários slides.
- Auditor local está indisponível.

## Critérios de sucesso
- **SC-001** Em teste com cinco slides elegíveis e gerador disponível, cinco imagens são aplicadas e a fila termina em 100%.
- **SC-002** Uma falha transitória é recuperada automaticamente sem reiniciar todo o carrossel.
- **SC-003** Arrastar continuamente dez controles mantém a interface interativa, sem atualização completa por evento.
- **SC-004** A imagem resultante conserva a direção visual e o contexto específico do slide.
- **SC-005** Nenhum cenário deixa a fila permanentemente em “pausada” sem causa e ação recuperável.

## Premissas
- Gemini é o provedor principal quando configurado; FLUX local permanece como fallback.
- Qualidade visual não será reduzida; a otimização elimina trabalho duplicado e move trabalho pesado para fora da interação.
