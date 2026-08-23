# Implementation plan: Recuperar sessão dos relatórios

## Technical context

O frontend encaminha chamadas `/api/` para a API segura e guarda um token de sessão no navegador. O servidor pode trocar esse token após reinicialização, tornando a cópia local inválida.

## Design

1. Centralizar a detecção de 401 no encaminhamento global das chamadas protegidas.
2. Manter uma única promessa de autenticação compartilhada entre chamadas simultâneas.
3. Repetir a chamada original somente depois de um login válido e no máximo uma vez.
4. Resolver a promessa no formulário existente sem recarregar a página.
5. Preservar a reconciliação bloqueante já aplicada aos lotes do relatório.

## Verification

- Validar sintaxe do JavaScript.
- Simular 401 seguido de login e resposta válida.
- Verificar que duas chamadas simultâneas abrem um único login.
- Confirmar que a segunda resposta 401 não cria repetição infinita.
