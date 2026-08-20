# Research: Conter falhas internas da geração de copy

## Decision 1: Não passar exceções brutas ao modelo

**Decision**: O fluxo usará códigos internos neutros como `model_empty`, sem anexar a mensagem original ao prompt editorial.

**Rationale**: O registro de 2026-08-15 confirma que “O modelo local retornou uma resposta vazia” entrou no campo de motivo da recuperação e virou o assunto dos cinco slides.

**Alternatives considered**: Pedir ao modelo para ignorar o erro. Rejeitada porque mantém o diagnóstico dentro do contexto disponível ao modelo.

## Decision 2: Validar contaminação com contexto

**Decision**: Termos operacionais são bloqueados somente quando formam um diagnóstico e não estavam no pedido original.

**Rationale**: Isso impede o vazamento sem quebrar pedidos legítimos sobre software, APIs ou servidores.

**Alternatives considered**: Proibir todas as palavras técnicas. Rejeitada por gerar falsos positivos.

## Decision 3: Recuperação atômica

**Decision**: O novo roteiro só substitui o estado atual depois de passar pelas validações estruturais, temáticas e de contaminação.

**Rationale**: Uma falha temporária não deve apagar um projeto válido nem deixar slides parcialmente gerados.

**Alternatives considered**: Atualizar o estado a cada tentativa. Rejeitada por expor conteúdo intermediário inválido.

## Decision 4: Cache somente após validação básica

**Decision**: Respostas vazias, inválidas ou contaminadas não serão armazenadas no cache reutilizável.

**Rationale**: Evita repetir o mesmo defeito em novas gerações.

**Alternatives considered**: Limpar todo o cache a cada falha. Rejeitada por desperdiçar respostas válidas sem necessidade.
