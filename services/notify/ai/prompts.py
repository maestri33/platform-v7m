"""Prompts do notify — texto que a IA escreve, sempre revisável por humano.

Os prompts pedem SAÍDA CRUA (só o HTML, só o texto). Modelo que responde com
"claro, aqui está" faz o dashboard salvar a conversa dentro do template.
"""

from django.conf import settings

from ai.client import complete

_SHELL_RULES = """Você escreve shells HTML de e-mail transacional.
Regras rígidas:
- Responda APENAS com o HTML completo, sem crases, sem explicação, sem markdown.
- Use tabelas e estilos inline (compatibilidade com Outlook/Gmail); nada de <script>.
- O HTML DEVE conter os marcadores literais {{title}} e {{content}}. Pode usar {{service_name}}.
- Largura máxima 600px, fundo neutro, contraste alto, responsivo por max-width.
- Português do Brasil no rodapé e nos textos fixos."""

_TEXT_RULES = """Você escreve mensagens transacionais curtas em português do Brasil.
Regras rígidas:
- Responda APENAS com o texto final, sem aspas, sem explicação, sem markdown de bloco.
- Preserve TODOS os placeholders no formato {chave} exatamente como recebidos.
- Sem emoji, a menos que já existam no texto original.
- Tom direto e cordial; frases curtas."""


def mail_shell(brand: str, accent: str = "", instructions: str = "", base_html: str = "") -> str:
    """Gera (ou reescreve) o shell HTML de e-mail de uma conta."""
    parts = [f"Marca: {brand or 'Notify'}."]
    if accent:
        parts.append(f"Cor de destaque: {accent}.")
    if instructions:
        parts.append(f"Pedido do operador: {instructions}")
    if base_html:
        parts.append("Reescreva o shell abaixo mantendo os marcadores:\n\n" + base_html[:6000])
    else:
        parts.append("Crie o shell do zero.")
    coding_model = getattr(settings, "AI_CODING_MODEL", "auto/best-coding")
    return complete(
        "\n".join(parts),
        system=_SHELL_RULES,
        temperature=0.5,
        max_tokens=2600,
        model=coding_model or None,
    )


def rewrite(text: str, instructions: str = "") -> str:
    """Reescreve o corpo de um template preservando placeholders."""
    pedido = instructions or "Deixe mais claro e objetivo, mantendo o sentido."
    chat_model = getattr(settings, "AI_CHAT_MODEL", "auto/best-chat")
    return complete(
        f"Pedido: {pedido}\n\nTexto atual:\n{text}",
        system=_TEXT_RULES,
        temperature=0.5,
        max_tokens=1200,
        model=chat_model or None,
    )


def subject_for(text: str) -> str:
    """Sugere assunto de e-mail a partir do corpo."""
    fast_model = getattr(settings, "AI_ADAPT_MODEL", "auto/best-fast")
    out = complete(
        f"Escreva um assunto de e-mail com no máximo 60 caracteres para esta mensagem:\n\n{text}",
        system=_TEXT_RULES,
        temperature=0.4,
        max_tokens=60,
        model=fast_model or None,
    )
    return out.splitlines()[0].strip().strip('"')[:120] if out else ""
