# Feature specification: Acesso por e-mail

## User scenarios and testing

### Login

O usuário entra com e-mail e senha para acessar as consultas protegidas do Analytics.

### Criar conta

O usuário informa e-mail e uma senha com pelo menos oito caracteres. O sistema cria a conta e solicita a confirmação pelo e-mail recebido.

### Esqueci a senha

O usuário informa o e-mail cadastrado e recebe um link. Ao abrir o link, define uma nova senha e volta ao login.

### Cenários de aceitação

1. Uma conta confirmada consegue entrar e retomar a operação que aguardava autenticação.
2. Uma conta não confirmada recebe orientação clara para verificar o e-mail.
3. O cadastro nunca informa se um e-mail já pertence a outra pessoa além do retorno seguro do provedor.
4. A recuperação exibe uma confirmação neutra mesmo quando o e-mail não existe.
5. O link de recuperação abre diretamente a definição da nova senha.
6. Nenhuma chave administrativa do banco aparece no navegador.

## Requirements

- FR-001: O login deve usar e-mail e senha.
- FR-002: O usuário deve poder criar uma conta pelo mesmo modal.
- FR-003: Contas novas devem confirmar o e-mail antes de acessar dados da Meta.
- FR-004: O usuário deve poder solicitar um link de redefinição por e-mail.
- FR-005: O sistema deve permitir definir uma nova senha ao abrir o link válido.
- FR-006: O backend deve intermediar todas as operações e manter segredos fora do frontend.
- FR-007: A autenticação bem-sucedida deve retomar consultas suspensas sem recarregar a página.
- FR-008: A auditoria Meta deve continuar bloqueante após a mudança de autenticação.

## Edge cases

- Link expirado ou já utilizado.
- Senha curta.
- E-mail inválido ou não confirmado.
- Falha temporária no envio de e-mail.
- Sessão da API alterada após reinicialização.

## Success criteria

- Cadastro, confirmação, login e redefinição podem ser concluídos sem acesso ao painel da VPS.
- A interface apresenta cada erro no formulário correspondente.
- Nenhum endpoint de métricas aceita uma chamada sem a sessão protegida.

## Assumptions

- O serviço de autenticação e envio de e-mail do Supabase está habilitado.
- A URL pública do Analytics está autorizada como destino dos links de e-mail.
