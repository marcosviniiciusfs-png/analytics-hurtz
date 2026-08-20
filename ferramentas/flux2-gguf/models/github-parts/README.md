# Modelos divididos para o GitHub

Os dois modelos maiores que 2 GiB foram divididos porque o GitHub LFS rejeita
arquivos individuais acima desse limite. Para reconstruir os arquivos no
Prompt de Comando, execute a partir da raiz do repositorio:

```bat
copy /b "ferramentas\flux2-gguf\models\github-parts\flux-2-klein-4b-Q4_K_M.gguf.part-*" "ferramentas\flux2-gguf\models\flux-2-klein-4b-Q4_K_M.gguf"
copy /b "ferramentas\flux2-gguf\models\github-parts\Qwen3-4B-Q4_K_M.gguf.part-*" "ferramentas\flux2-gguf\models\Qwen3-4B-Q4_K_M.gguf"
```

Os arquivos reconstruidos sao ignorados pelo Git para evitar duplicacao.
