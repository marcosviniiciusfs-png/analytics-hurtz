# Feature specification: Recuperar sessão dos relatórios

## User scenarios and testing

### Cenário principal

Ao criar relatórios com uma sessão expirada, o sistema solicita novamente as credenciais e continua a mesma criação após o login, preservando contas e período.

### Cenários de aceitação

1. Dada uma sessão válida, ao clicar em "Criar relatório", a auditoria começa normalmente.
2. Dada uma sessão ausente ou expirada, ao clicar em "Criar relatório", o login protegido aparece e a consulta fica aguardando.
3. Dado um login válido durante a consulta, o sistema repete a requisição recusada uma única vez e continua o relatório sem novo clique.
4. Dado um login inválido, o sistema mantém a seleção e informa o erro sem iniciar consultas duplicadas.
5. Se a API continuar recusando a nova sessão, o sistema encerra a tentativa com uma mensagem visível.

## Requirements

- FR-001: Todas as chamadas protegidas do Analytics devem detectar resposta de sessão não autorizada.
- FR-002: O sistema deve remover credenciais locais inválidos antes de solicitar novo login.
- FR-003: Uma chamada interrompida por sessão expirada deve aguardar a autenticação e ser repetida uma vez.
- FR-004: Solicitações simultâneas devem compartilhar o mesmo pedido de login.
- FR-005: A seleção de contas, o período e o progresso já concluído devem permanecer intactos.
- FR-006: A auditoria Meta continua bloqueante e nenhum relatório pode usar dados estimados.

## Edge cases

- O usuário informa credenciais incorretas.
- A API retorna 401 novamente depois do login.
- Várias consultas recebem 401 ao mesmo tempo.
- A API fica indisponível durante a renovação.

## Success criteria

- Uma sessão expirada pode ser recuperada sem recarregar a página e sem repetir manualmente o clique.
- Apenas uma janela de login aparece para chamadas simultâneas.
- Nenhum relatório é liberado sem reconciliação válida da Meta.

## Assumptions

- A API segura mantém o endpoint de sessão já existente.
- O usuário autorizado conhece as credenciais do monitoramento.
