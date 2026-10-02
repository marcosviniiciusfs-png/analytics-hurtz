# Fluxo de Lead Ads

O Traffic Pocket usa um único webhook para todos os usuários. Configure uma vez no ambiente do backend: `META_APP_SECRET`, `META_VERIFY_TOKEN`, `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`.

Na Meta, a URL de callback é `https://SEU-DOMINIO/webhook`; use `META_VERIFY_TOKEN` como token de verificação e assine o objeto Page/campo `leadgen`.

Cada usuário só precisa conectar o Facebook no Traffic Pocket, escolher Página, formulário e grupo WhatsApp no menu Fluxo. Ao ativar, o backend assina o evento `leadgen` automaticamente para a Página, guarda a associação por formulário e usa o token de Página criptografado do usuário para recuperar o lead.

Os campos acima são de operação do Traffic Pocket e nunca são exibidos aos usuários.
