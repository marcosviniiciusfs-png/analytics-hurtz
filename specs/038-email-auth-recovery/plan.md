# Implementation plan: Acesso por e-mail

## Architecture

O frontend usa formulários próprios e chama endpoints públicos limitados de autenticação. O backend conversa com o serviço de identidade já associado ao banco do projeto. Depois de validar a identidade, entrega a sessão curta usada pela API do monitor.

## Security

- Segredos administrativos permanecem apenas na VPS.
- Cadastro exige confirmação de e-mail.
- Recuperação usa token temporário do link recebido.
- Os endpoints de métricas continuam protegidos pela sessão da API.

## UI

O modal terá três fluxos separados: entrar, criar conta e recuperar senha. O link de recuperação abre um quarto estado para definir a nova senha.

## Verification

- Validar sintaxe do frontend e backend.
- Consultar a configuração pública do provedor de identidade.
- Testar respostas de cadastro, login inválido e recuperação.
- Confirmar que métricas continuam retornando 401 sem sessão.
- Verificar publicação no domínio de produção.
