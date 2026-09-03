# Plano técnico

1. Adicionar armazenamento seguro e diagnóstico da chave Ideogram no processo principal.
2. Implementar o cliente oficial do endpoint Ideogram 4, baixar imediatamente a URL temporária e retornar uma imagem local em base64.
3. Criar um construtor determinístico do JSON nativo do Ideogram 4, composto somente por objetos e com a ordem de campos exigida pelo modelo.
4. Separar copy, significado físico e direção visual; decompor a direção em atributos preservados e impedir vazamento de texto literal.
5. Atribuir um arquétipo de composição exclusivo para cada slide e registrar a assinatura visual esperada.
6. Implementar auditoria objetiva assíncrona: OCR, detecção de grade/colagem e hash perceptual; corrigir automaticamente somente resultados reprovados.
7. Atualizar configurações e estados do provedor segundo padrões de formulários, alertas e feedback acessível, sem alterar o design system existente.
8. Invalidar apenas imagens automáticas do pipeline anterior e manter uploads do usuário intactos.
9. Criar testes de contrato, prompt, segurança, fallback, diversidade, rejeição e desempenho da fila.
10. Executar regressão, análise de convergência, empacotar e validar o executável instalado.

## Arquivos principais

- `main.js`: armazenamento seguro, cliente Ideogram, download e auditoria estrutural.
- `preload.js`: métodos seguros para status, chave, geração e inspeção.
- `app.js`: configuração, prompt JSON, fila, retry, diversidade e fallback.
- `index.html` e estilos: configuração do provedor e feedback.
- `scripts/`: testes E2E, contrato e segurança.

