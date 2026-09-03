# GrowFlow Assistant

Extensão Chrome Manifest V3 para organizar prospecção manual no Instagram. Ela coleta somente nomes de perfis que já estão visíveis na página, monta uma fila local, abre perfis para revisão e registra as confirmações feitas pelo usuário.

## Instalação

1. Abra `chrome://extensions` no Chrome.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione esta pasta (`GrowFlow Assistant`).
5. Abra o Instagram, navegue até uma lista ou busca e clique no ícone da extensão.

## Recursos

- coleta de até 100 perfis visíveis por leitura;
- fila com abertura e confirmação manual;
- limite diário configurável e métricas;
- lembretes persistentes com `chrome.alarms`;
- histórico local e exportação CSV;
- interface em português e sem dependências externas.

## Privacidade e limites

Os dados ficam em `chrome.storage.local`. A extensão não solicita senha, não usa APIs privadas, não executa seguir/curtir/comentar automaticamente e não possui técnicas de evasão de detecção.
