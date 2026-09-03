# Análise de consistência

## Resultado

Especificação, plano, tarefas e implementação estão alinhados para o uso do Ideogram 4 via API como provedor principal, com FLUX local como contingência. A chave é armazenada com `safeStorage` fora do código e não é exposta ao renderer.

## Cobertura verificada

- Prompt estruturado nativo do Ideogram com elementos exclusivamente do tipo `obj`.
- Direção visual, paleta, iluminação, enquadramento e estilo preservados por slide.
- Copy usada para interpretação sem ser enviada como texto literal para a imagem.
- Arquétipos distintos por slide, com mudança de sujeito, ação, cenário e câmera.
- Auditoria posterior de OCR, colagem e hash perceptual, com nova tentativa automática.
- Fila sequencial para evitar travamentos no editor e progresso por slide.
- Migração limitada a imagens automáticas de pipelines inseguros anteriores.
- Regressão completa do editor, exportação, formatos, cores, overlay e tipografia.

## Limite externo

A chamada real ao serviço Ideogram depende de uma chave própria da API e de créditos disponíveis. Sem ela, o aplicativo utiliza o FLUX local sem bloquear a criação.
