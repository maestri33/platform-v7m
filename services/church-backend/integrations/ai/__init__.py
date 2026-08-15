"""Integração IA (integrations.ai).

Engine multi-provider com fallback chain (LFM multi-provider) + mídia
(ElevenLabs primário, MiniMax fallback para TTS; Gemini para imagem/visão;
Google Vision para OCR). Tabela ``ai_call`` grava 1 linha por tentativa.

M1.7 — porta o molde do backend-supletivo/integrations/ai, adaptado pro
core.settings do IEADPG (os.getenv direto, sem ``env.list``).
"""
