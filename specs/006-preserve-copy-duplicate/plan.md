# Implementation Plan

1. Separar a extração de blocos da decisão de preservar.
2. Preservar automaticamente carrosséis estruturados completos dentro dos limites.
3. Manter blocos grandes no pipeline de compactação.
4. Trocar a duplicação superficial por clone profundo e renumerar os slides.
5. Validar com testes determinísticos sem depender do Ollama.

## Files

- `Hurtz Flow Studio/app.js`
- `Hurtz Flow Studio/scripts/copy-preservation-duplicate-test.js`
- `Hurtz Flow Studio/package.json`
