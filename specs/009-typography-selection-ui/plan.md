# Implementation Plan

## Technical Context

- Aplicativo Electron com editor em Canvas 2D.
- Estado tipográfico salvo por slide e por intervalo de caracteres.
- Fontes locais empacotadas com o aplicativo.

## Approach

1. Catalogar capacidade real das fontes e expor metadados de suporte.
2. Reestruturar o editor de conteúdo em blocos independentes e acessíveis.
3. Tornar estados, tooltips e seleção observáveis.
4. Preservar intervalos de estilo em transformações de caixa.
5. Validar aparência, isolamento das métricas, renderização de estilos e desempenho.
6. Empacotar e implantar no executável usado pelo launcher.
7. Centralizar a normalizacao e sincronizacao da cor de fundo entre controles duplicados, estado e renderer.
8. Auditar os caminhos de pintura de todos os formatos e validar uma matriz de cards com amostragem de pixels.
9. Instrumentar todas as classes de controle do editor e localizar pinturas, miniaturas e persistencias redundantes.
10. Centralizar pre-visualizacoes continuas em um agendador por quadro e commits em uma rotina unica ao final da interacao.
11. Validar controles, fluidez e isolamento de falhas no codigo-fonte e no executavel instalado.
12. Medir arrastes temporizados e separar a superfície de pré-visualização interativa da superfície integral de exportação.
13. Consolidar a confirmação em uma única pintura integral seguida de miniaturas, vizinhos e persistência.
