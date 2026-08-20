# Especificação: Ideogram com fidelidade visual

## Cenários do usuário

### US1 — Gerar imagens fiéis à direção visual (P1)
Ao solicitar imagens para um carrossel, o usuário recebe uma cena específica por slide que respeita todos os atributos fornecidos na direção visual, como estilo, paleta, iluminação, enquadramento, ambiente, assunto e restrições.

### US2 — Receber imagens limpas, sem texto (P1)
As imagens geradas não contêm letras, palavras, números, logotipos, legendas, interfaces, documentos legíveis, cartazes ou pseudotexto. Todo texto do carrossel continua sendo uma camada separada do editor.

### US3 — Obter variedade real entre slides (P1)
Cada slide usa assunto, ação, cenário e enquadramento próprios. A identidade visual da campanha permanece coerente sem repetir a mesma composição, a mesma pessoa, a mesma sala ou uma grade de imagens.

### US4 — Continuar gerando se o provedor principal falhar (P2)
Se o provedor principal estiver sem chave, sem saldo, indisponível ou recusar a solicitação, o sistema tenta o fallback local configurado e informa qual provedor concluiu cada imagem.

## Requisitos funcionais

- **FR-001** O Ideogram 4 hospedado deve ser o provedor principal de imagens quando uma chave válida estiver configurada.
- **FR-002** A chave deve ser salva em armazenamento seguro do sistema operacional e nunca em código-fonte, arquivos versionados ou armazenamento comum do navegador.
- **FR-003** O FLUX local deve permanecer como fallback automático quando o Ideogram estiver indisponível.
- **FR-004** A direção visual deve ser decomposta e preservada em atributos independentes: estética, meio visual, paleta, iluminação, câmera/enquadramento, assunto, ação, ambiente e restrições.
- **FR-005** A copy literal não deve ser enviada como conteúdo visual. Ela deve ser interpretada em uma cena física que preserve o sentido do slide sem introduzir palavras na imagem.
- **FR-006** O contrato visual deve permitir somente objetos e cenários; nenhum elemento de texto pode ser solicitado ao gerador.
- **FR-007** Cada slide deve receber um arquétipo visual diferente, variando pelo menos assunto, ação, cenário e enquadramento, sem perder a identidade compartilhada da campanha.
- **FR-008** A imagem retornada deve ser auditada para detectar texto ou pseudotexto, grade/colagem e repetição perceptual antes de ser aplicada ao slide.
- **FR-009** Uma imagem reprovada deve ser corrigida automaticamente com uma nova composição; ela não pode ser exibida como concluída.
- **FR-010** O progresso deve continuar visível por slide, incluindo geração, validação, correção, fallback, conclusão e falha recuperável.
- **FR-011** A fila deve manter concorrência limitada e não bloquear a edição do carrossel durante geração ou auditoria.
- **FR-012** Imagens antigas do pipeline que aceitava resultados sem auditoria devem ser marcadas para regeneração, sem apagar imagens enviadas manualmente pelo usuário.
- **FR-013** A tela de configurações deve distinguir Ideogram, Gemini, FLUX por API e FLUX local, exibindo estado da chave e fallback com linguagem clara.

## Casos extremos

- Chave Ideogram ausente, inválida, sem crédito ou bloqueada.
- API retorna URL temporária que precisa ser baixada imediatamente.
- Resultado contém uma única palavra pequena, marca d'água ou pseudotexto.
- Cena parece um painel, storyboard, print, infográfico ou mosaico mesmo sem texto detectável.
- Slides diferentes repetem a mesma composição com pessoas ou ângulos levemente alterados.
- Direção visual contém instruções conflitantes com a regra absoluta de não gerar texto.
- Auditoria local de OCR está temporariamente indisponível.

## Critérios de sucesso

- **SC-001** Em um carrossel de cinco slides, todos os prompts preservam os atributos válidos da direção visual fornecida.
- **SC-002** Nenhuma imagem aceita contém texto detectável, pseudotexto evidente, grade, colagem ou layout de card dentro da própria imagem.
- **SC-003** Os cinco slides usam cinco composições visualmente diferentes, com variação verificável de assunto, ação, cenário e enquadramento.
- **SC-004** A fila conclui os cinco itens com progresso correto e mantém o editor interativo durante todo o processo.
- **SC-005** Quando o Ideogram falha e o FLUX está pronto, a geração continua no fallback sem reiniciar o carrossel inteiro.
- **SC-006** Nenhum segredo de provedor aparece no código, no pacote do aplicativo ou no armazenamento comum do navegador.

## Premissas

- O uso comercial será feito pela API oficial do Ideogram. Os pesos locais abertos não serão incorporados ao produto porque a licença do modelo é não comercial.
- O usuário fornecerá uma chave da API Ideogram na tela de configurações.
- A regra de não gerar texto tem prioridade sobre qualquer pedido de tipografia presente na direção visual.
- Imagens adicionadas manualmente pelo usuário não serão removidas ou regeneradas automaticamente.

