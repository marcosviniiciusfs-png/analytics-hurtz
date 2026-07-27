# Tarefas — PLANKA

Integração interna do Analytics Hurtz com o PLANKA 2.1.1.

- Produção: `https://tarefas.161-97-148-99.sslip.io`
- Orquestração: Docker Swarm
- Proxy e HTTPS: Traefik + Let's Encrypt
- Persistência: volumes Docker separados para arquivos e PostgreSQL
- Segredos: Docker Secrets externos; nenhum segredo deve ser versionado

O domínio pode ser alterado para `tarefas.hurtzcompany.com` depois que o DNS
apontar para a VPS. Nesse caso, altere `BASE_URL` e a regra `Host` do Traefik
antes de executar novamente:

```bash
docker stack deploy -c /opt/planka/docker-stack.yml planka
```

O uso desta instalação deve permanecer interno à Hurtz conforme a PLANKA
Community License. Compartilhamento comercial com outras organizações exige a
licença correspondente do fornecedor.
