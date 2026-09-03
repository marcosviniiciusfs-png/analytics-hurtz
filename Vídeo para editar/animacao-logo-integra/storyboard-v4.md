# Storyboard v4 — Integra

## Ideia central

Uma linha de base representa organizacao contabil. Dela nascem as barras; o crescimento acumulado gera a curva e a seta. A energia da seta continua horizontalmente e revela o nome. A assinatura termina exatamente igual ao vetor oficial.

## Personalidade de movimento

- Corporativa premium, segura e precisa.
- Uma unica direcao dominante: esquerda para direita e de baixo para cima.
- Sem bounce ou efeitos gratuitos. Usar zoom editorial, glitch tipografico e scan apenas nos pontos de mudanca de funcao.
- Curva principal: `cubic-bezier(0.2, 0, 0, 1)`.
- Duracoes: 8 frames para acao curta, 14 frames para acao media e 24 frames para desenho da curva.

## Quadros-chave

1. **F0 — Silencio visual:** fundo neutro; nenhum elemento.
2. **F12–30 — Fundacao:** uma linha fina nasce sob o simbolo. As tres barras sobem em sequencia, mantendo o mesmo piso.
3. **F28–58 — Crescimento + push-in:** uma curva unica e continua e desenhada sobre as barras enquanto a camera avanca de 100% para 112%, mantendo a ponta da curva como ponto focal.
4. **F54–72 — Zoom de transferencia:** a ponta da seta ocupa o enquadramento por no maximo 8 frames. Sua diagonal faz match cut com a haste inicial do `I`, evitando um zoom sem destino.
5. **F68–82 — Glitch estrutural:** o wordmark aparece em tres fatias horizontais deslocadas por 4–8 px durante 2 frames, estabiliza por 2 e repete uma unica vez com amplitude menor. Sem ruido aleatorio, RGB split ou tremor continuo no animatic.
6. **F76–108 — Nome + scan:** `INTEGRA` estabiliza como assinatura unica; uma linha de scan fina termina a revelacao da esquerda para a direita sem deformar os glifos.
7. **F100–126 — Qualificacao:** a linha desce discretamente para a baseline do subtitulo e revela `ASSESSORIA CONTABIL`.
8. **F122–154 — Resolucao + zoom-out:** a camera retorna de 112% para 100%, revelando a assinatura oficial completa. Linha e efeitos desaparecem antes do hold final de 24 frames.

## Efeitos visuais previstos

- **Push-in:** 100% para 112% entre F28 e F58, easing suave e ponto focal na seta.
- **Match zoom:** 112% para 138% entre F54 e F62; corte geometrico da diagonal da seta para a haste do `I`; retorno a 112% ate F72.
- **Glitch tipografico:** dois pulsos de 2 frames, usando fatias do proprio wordmark; deslocamento maximo de 8 px.
- **Scan line:** linha de 2 px vinculada a mascara do nome e depois ao subtitulo.
- **Zoom-out de resolucao:** 112% para 100% entre F122 e F142; sem overshoot.

## Regras de continuidade

- Toda nova acao deve comecar antes de a anterior terminar completamente, com sobreposicao de 3–5 frames.
- Zoom e glitch devem causar uma transicao ou mudanca de leitura; nao podem funcionar como decoracao independente.
- A linha de base causa as barras; as barras causam a curva; a curva causa a revelacao do nome; o nome conduz ao subtitulo.
- Nenhum elemento atravessa mais de um terco do quadro sem uma mudanca de funcao.
- O frame final deve ser uma sobreposicao exata do SVG aprovado.

## Gate para o animatic

Produzir em preto, branco e cinza, sem audio, sombra, gradiente ou cor da marca. Avaliar: clareza sem som, continuidade causal, ausencia de espaco morto, tempo de leitura e fidelidade final.
