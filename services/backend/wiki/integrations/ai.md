# Integrações de IA

`integrations.ai.service` é a interface interna para JSON, resumo, correção, visão, OCR e transcrição.
A cadeia LLM usa providers OpenAI-compatible e registra cada tentativa em `AiCall`.

Configuração principal:

```env
IA_PROVIDERS=deepseek,minimax
IA_FALLBACK_CHAIN=minimax:MiniMax-M3,deepseek:deepseek-v4-pro
IA_<NAME>_BASE_URL=...
IA_<NAME>_API_KEY=...
GEMINI_API_KEY=...
GOOGLE_VISION_API_KEY=...
```

A visão usa OmniRoute com fallback direto no MiniMax. Gemini atende transcrição e Google Vision,
OCR. Geração de imagem e TTS não pertencem a este backend.
