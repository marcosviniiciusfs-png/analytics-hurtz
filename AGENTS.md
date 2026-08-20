# Regras do workspace CBO

## Escrita e copy

Ao criar ou revisar textos autorais neste workspace, usar a skill `humanizer` como etapa final para remover padrões reconhecíveis de escrita por IA, preservando fatos, intenção, tom, dor, desejo, promessa e CTA. Textos fornecidos pelo usuário com instruções como "manter exatamente" ou "sem reescrever" não devem ser humanizados nem alterados.

## Desenvolvimento orientado por especificacao

Ao construir ou modificar qualquer software, produto, funcionalidade, interface, automacao ou integracao neste workspace:

- usar obrigatoriamente as skills do GitHub Spec Kit instaladas em `.agents/skills/`;
- definir ou atualizar a especificacao com `speckit-specify` antes de implementar;
- usar `speckit-clarify` quando houver requisitos ambíguos ou decisões que alterem materialmente o resultado;
- produzir o plano com `speckit-plan` e as tarefas verificáveis com `speckit-tasks`;
- executar a construcao com `speckit-implement`;
- usar `speckit-analyze` antes da implementacao quando houver multiplos artefatos de especificacao, plano e tarefas;
- finalizar com `speckit-converge` para comparar o resultado com a especificacao e registrar qualquer trabalho restante;
- manter especificacao, plano, tarefas, testes e implementacao alinhados; uma falha de validacao deve gerar correcao, nao apenas um aviso;
- para correcoes urgentes e pequenas, atualizar ao menos a especificacao afetada, implementar, testar e executar a verificacao de convergencia.

O fluxo Spec Kit e obrigatorio e complementar as demais skills especificas deste workspace.

## Edicao de video

Ao criar, editar ou revisar qualquer video neste workspace:

- usar obrigatoriamente a skill `video-shotcraft` como fonte exclusiva para transicoes, movimentos, efeitos visuais, efeitos sonoros, trilhas, sincronizacao musical, receitas de cenas e componentes de motion design;
- selecionar e adaptar somente recursos, shot cards, demos, componentes e assets existentes na `video-shotcraft`, seguindo integralmente seu pipeline, suas regras de sound design e seu QA;
- nao inventar transicoes, movimentos, efeitos ou desenho de som fora da `video-shotcraft`, mesmo quando uma implementacao autoral parecer mais simples;
- nao usar `react-bits`, `galaxy`, `21st` ou outra biblioteca para motion design, transicoes ou efeitos, salvo quando o usuario autorizar explicitamente a excecao;
- quando a `video-shotcraft` nao oferecer um recurso necessario, informar a limitacao e pedir autorizacao antes de recorrer a outra fonte ou criar uma solucao propria;
- adaptar animacoes ao tempo deterministico do Remotion (`useCurrentFrame`, `interpolate`, `spring`) quando o codigo original depender de tempo real, hover, mouse, scroll ou eventos do navegador;
- nao limitar efeitos a overlays sobre personagens. Quando a narrativa pedir foco, contraste ou respiro, inserir uma microcena grafica em tela cheia, branca ou de outra cor coerente com a marca, enquanto voz, trilha ou continuidade sonora permanecem ativas;
- considerar quadros graficos em tela cheia para numeros, conceitos, listas, comparacoes, provas, transicoes de assunto e CTA;
- nao usar componentes apenas porque estao disponiveis: todo efeito deve melhorar significado, ritmo, prova ou compreensao;
- preservar as licencas, fontes e creditos documentados pela `video-shotcraft`, especialmente para BGM e SFX.

A `video-shotcraft` e uma referencia/fonte. Copiar para cada projeto somente os componentes, shot cards e assets realmente usados, evitando incorporar a biblioteca completa no render final.

## Entrega de vídeos

- Salvar todos os vídeos finalizados em `Vídeo para editar/Videos Prontos/`.
- Manter arquivos de projeto, análises, frames de QA e renders intermediários fora dessa pasta; ela deve conter apenas entregas prontas.
