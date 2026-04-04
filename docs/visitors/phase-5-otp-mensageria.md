# IEADPG Visitantes — Fase 5 (Agente 5: Integração OTP e Mensageria)

## 1. Link oficial

Padrão oficial de magic link (frontend):

`https://dominio-do-frontend.com/login/<profile_uuid>?otp=<codigo>`

Regras:
- `profile_uuid` obrigatório.
- `otp` obrigatório com 6 dígitos.
- Link deve ser montado por função única no backend para evitar formatos divergentes.

---

## 2. Mensagem oficial

Template base (pt-BR):

- Título: `# Código de verificação`
- Conteúdo:
  1. `Seu código de verificação é *<OTP>*.`
  2. `Ou acesse clicando no link:`
  3. `<MAGIC_LINK>`
  4. `Se você não solicitou este acesso, ignore esta mensagem.`

Regras de conteúdo:
- Linguagem clara, curta e orientada à ação.
- OTP e link devem carregar o mesmo código válido.
- Nunca incluir dados sensíveis adicionais no texto.

---

## 3. Contrato ideal do auth/check

Response recomendado:

```json
{
  "message": "Codigo de verificacao enviado com sucesso.",
  "first_name": "João",
  "profile_uuid": "<uuid>",
  "magic_link": "https://dominio-do-frontend.com/login/<uuid>?otp=<codigo>",
  "is_visitor": true
}
```

Campos obrigatórios:
- `first_name`
- `profile_uuid`
- `magic_link`
- `is_visitor` (booleano)

---

## 4. Regras de expiração

Regra oficial:
- OTP com validade de **10 minutos**.
- OTP de uso único (invalidate após login bem-sucedido).
- Novo OTP invalida o OTP anterior.

Observação:
- Implementação atual já invalida o código após login bem-sucedido (senha inutilizável), mas a janela temporal de expiração deve ser formalizada no backend.

---

## 5. Regras de reenvio

Política oficial:
- Cooldown técnico de **60 segundos** por telefone para novo envio.
- Limite de **5 envios por 15 minutos**.
- Em excesso, retornar erro amigável sem revelar detalhes internos.

Mensagem sugerida de bloqueio temporário:
- `Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.`

---

## 6. Riscos e recomendações

Riscos:
1. Link divergente entre canais (mensagem e resposta API).
2. Reenvio sem limites gerando abuso/custo.
3. Ausência de TTL explícito criando risco operacional.

Recomendações:
1. Manter builder único de link no backend.
2. Publicar TTL/cooldown no contrato e na OpenAPI.
3. Reutilizar `auth/check` como ponto único de emissão OTP.
4. Garantir observabilidade (contadores de envio, falha, expiração, login por link).

---

## Handoff (obrigatório)

### 1. O que ficou validado
- Padrão oficial de magic link foi definido e alinhado ao fluxo de login por UUID + OTP.
- Payload alvo de `auth/check` inclui `first_name`, `profile_uuid`, `magic_link` e `is_visitor` booleano.
- Política mínima de expiração e reenvio foi definida como recomendação oficial.

### 2. O que depende do próximo agente
- Agente 4 deve consumir `magic_link` no frontend sem lógica implícita.
- Agente 6 deve validar cenários de token expirado, reenvio e tentativas repetidas.

### 3. O que ainda está ambíguo
- Estratégia futura de observabilidade detalhada por canal (WhatsApp/e-mail).

### 4. O que NÃO deve ser alterado sem nova validação
- Formato do link `/login/<profile_uuid>?otp=<codigo>`.
- Obrigatoriedade de `profile_uuid` e `magic_link` no `auth/check` alvo.
- Regra de OTP de uso único.
