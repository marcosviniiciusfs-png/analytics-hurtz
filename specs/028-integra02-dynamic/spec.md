# Especificação: Integra 02 dinâmico

## Objetivo

Editar `Vídeo para editar/Integra 02.mp4` com a linguagem aprovada no Integra 01, preservando clareza, ritmo, enquadramento e qualidade do original.

## Requisitos funcionais

- FR-001 Preservar a resolução original 1440×2360, 30 fps, duração e sincronismo da fala.
- FR-002 Usar legendas brancas com sombra e entrada/saída por desfoque, dentro da área segura quadrada central Y=460..1900.
- FR-003 Manter uma tag vermelha `PARAUAPEBAS` na parte superior, ocultando-a durante microcenas em tela cheia.
- FR-004 Criar um gancho visual para `paga impostos todos os meses` e `regime tributário adequado`, sem cobrir olhos, boca ou rosto.
- FR-005 Criar uma microcena de apresentação para `PLANEJAMENTO TRIBUTÁRIO`.
- FR-006 Apresentar em lista os cinco fatores analisados: faturamento, folha de pagamento, atividade, custos e particularidades.
- FR-007 Criar uma transformação semântica entre `não é sonegação / não é só o imposto mais barato` e `decisão estratégica e legal`.
- FR-008 Criar CTA final sincronizado com `me siga`, sem texto ou elementos concorrentes.
- FR-009 Usar apenas movimentos, transições e SFX da video-shotcraft, com cada entrada sonora sincronizada e voz dominante.
- FR-010 Evitar cards soltos sobre o apresentador, colisões, sobreposição de elementos e flashes do vídeo real entre microcenas.
- FR-011 Entregar MP4 de alta qualidade em `Vídeo para editar/Videos Prontos/` e projeto editável fora dessa pasta.
- FR-012 Sincronizar cada legenda e cada item visual à palavra correspondente, sem antecipação e sem persistência após o fim da frase.
- FR-013 Fazer a lista começar em 11,06 s, com faturamento em 11,72 s, folha em 13,33 s, atividade em 14,76 s, custos em 16,56 s e particularidades em 17,69 s.
- FR-014 Reforçar o CTA de 39,23 s a 44,23 s em quatro etapas, finalizando com botão `ME SIGA`, animação de pressionamento e som de clique exclusivo desse botão.
- FR-015 Remover o sinal de interrogação de `MAIS ADEQUADO` no gancho e de `COM ESTRATÉGIA` no CTA.
- FR-016 Entre 20 s e 26,5 s, compactar a lista para a região superior e usar o centro para legendas cinéticas sincronizadas com comparar cenários, tributários, identificar oportunidades, economia e legislação.

## Critérios de sucesso

- SC-001 Todos os textos permanecem legíveis em velocidade normal.
- SC-002 Nenhum elemento cobre o rosto do apresentador.
- SC-003 As microcenas acompanham exatamente os assuntos da fala.
- SC-004 O áudio contém SFX perceptíveis, sem clique genérico repetido e sem clipping.
- SC-005 O arquivo final decodifica integralmente e mantém exatamente 1327 quadros.
- SC-006 Entradas e saídas de legendas e elementos devem ficar dentro de três quadros do início/fim real das respectivas palavras.
- SC-007 A lista compactada não pode colidir com a legenda cinética central.

## Decisões visuais

- Paleta: azul-marinho, verde institucional, creme e vermelho apenas na tag/alertas.
- Tipografia: Arial/Helvetica em caixa alta nos títulos e branco com sombra nas legendas.
- Movimento: profissional, direto e controlado; entradas entre 18 e 28 quadros, com pausas para leitura.
- Área segura: toda informação recorrente fica dentro da janela quadrada central Y=460..1900.

## Storyboard

| # | Tempo | Cena | Movimento |
|---|---|---|---|
| 1 | 0,00–8,26 | Apresentador + gancho sobre impostos e regime adequado | `type-assembly-moves`, variante split-text-stagger |
| 2 | 8,26–11,06 | Título em tela cheia: planejamento tributário | split-text-stagger com linha de base |
| 3 | 11,06–26,76 | Lista dos cinco fatores sincronizada palavra por palavra | `list-reveal`, com deriva lenta do conjunto |
| 5 | 26,76–32,32 | Negação vira conclusão estratégica | `card-flip-reveal`, flip semântico |
| 6 | 32,32–39,20 | Apresentador + conclusão legal | blur-slide por palavra |
| 7 | 39,23–44,23 | CTA progressivo em quatro etapas e botão pressionado | split-text-stagger + resposta de clique |

## Casos de borda

- Os primeiros e últimos quadros de cada microcena não podem revelar o apresentador por um único frame.
- A tag e as legendas devem sair durante telas cheias.
- O áudio AAC pode conter apenas padding terminal imperceptível; não pode haver atraso audível.
