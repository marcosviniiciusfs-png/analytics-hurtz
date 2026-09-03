# Research

## Hardware e pesos

- GPU: NVIDIA GeForce RTX 4060 Ti, 8.188 MiB.
- RAM: 32 GB.
- Disco livre no início: aproximadamente 80 GB.
- Repositório NF4: aproximadamente 15 GB de pesos efetivos e 26,3 GB de armazenamento publicado total.
- Componentes principais: Qwen3-VL 5,107 GB; transformer condicional 4,863 GB; transformer incondicional 4,863 GB; VAE 0,157 GB.

## Gargalos confirmados

1. O pipeline oficial carrega os dois transformers, o Qwen3-VL e o VAE no mesmo dispositivo.
2. O conjunto não cabe em 8 GB; sem adaptação, a falha acontece durante o carregamento ou a primeira inferência.
3. O preset padrão é `V4_QUALITY_48`; cada etapa executa ramo condicional e incondicional.
4. O app anterior fazia interpretação, geração, OCR e auditoria sequencial, mas não expunha tempos; em caso de geração remota ou fallback, a interface permanecia em “validando” sem explicar o custo.
5. Iniciar um processo Python por imagem repetiria carregamento e download/cache lookup.
6. `device_map="balanced"` nÃ£o pode ser usado com este checkpoint NF4 em baixa VRAM: ao enviar o Qwen para CPU, o Accelerate pode deixar seus estados quantizados no dispositivo `meta`, causando `Cannot copy out of meta tensor` antes da inferÃªncia.
7. A estratÃ©gia validÃ¡vel para a RTX 4060 Ti de 8 GB Ã© `enable_model_cpu_offload()`: cada componente completo Ã© materializado e transferido entre RAM e CUDA conforme o uso, evitando estados NF4 vazios.

## Acesso externo obrigatório

Os pesos são gated. O usuário precisa aceitar a licença na página do modelo e autenticar o Hugging Face uma vez. O instalador pode preparar dependências, mas não pode aceitar a licença em nome do usuário.
