# Arquitetura proposta

```text
Ligação / SIP / provedor telefônico
        ↓
Transporte de áudio Pipecat
        ↓
VAD + detecção de turno/interrupção
        ↓
STT streaming em português
        ↓
Contexto do cliente + documentos + CRM
        ↓
LLM com fluxo e limites de atendimento
        ↓
TTS de baixa latência e voz natural
        ↓
Áudio de retorno para a ligação
```

## Decisões

- Python próprio: 3.12.
- Pipecat como orquestrador de voz, não como modelo.
- Provedor telefônico desacoplado.
- Memória da chamada separada da base de treinamento.
- Transferência humana obrigatória para exceções.
- Gravação e consentimento configuráveis conforme a operação.
