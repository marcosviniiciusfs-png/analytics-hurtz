# Research: Pipeline gratuito de imagens Cloudflare

## Decision: Workers AI REST no processo principal

O endpoint exige Account ID e Bearer token. Manter a chamada no processo principal impede que o renderer receba a credencial.

## Decision: contratos separados por modelo

O FLUX.2 Klein 4B exige multipart/form-data, inclusive em text-to-image, com quatro passos fixos. O FLUX.1 Schnell aceita JSON com prompt, seed e até oito passos. Um adaptador único que enviasse JSON aos dois modelos falharia no principal.

## Decision: cache local limitado

O cache evita gastar franquia em prompts idênticos. A chave inclui a versão do pipeline para impedir reuso após mudanças relevantes no prompt ou auditoria.

## Alternatives considered

- Gemini image: sem camada gratuita de imagem no contrato atual.
- Hugging Face: crédito gratuito insuficiente para carrosséis frequentes.
- Ideogram web: permanece como alternativa manual, mas não oferece automação por API gratuita.
