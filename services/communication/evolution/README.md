# Evolution API

Integração de envio para WhatsApp usada pelo projeto.

## Send Media

O endpoint validado em produção/dev foi o `v2`:

- documentação oficial: `https://doc.evolution-api.com/v2/api-reference/message-controller/send-media`
- endpoint: `POST /message/sendMedia/{instance}`

Payload funcional:

```json
{
  "number": "5543996648750",
  "mediatype": "image",
  "mimetype": "image/jpeg",
  "caption": "Legenda opcional",
  "media": "<base64 puro ou URL>",
  "fileName": "media.jpg",
  "delay": 0
}
```

### Observações práticas

- Para imagem em base64, o valor de `media` deve ser base64 puro.
- Não usar prefixo `data:image/jpeg;base64,`.
- `fileName` precisa ter extensão real e coerente com o MIME.
- Exemplo que funcionou: `media.jpg`.
- Exemplo que causou problema visual na Evolution: `media.image`.
- Quando o `fileName` estava inválido, a resposta vinha com `imageMessage.mimetype = "false"`.
- Com `fileName` correto, a resposta passou a vir com `imageMessage.mimetype = "image/jpeg"`.

### Wrapper atual

O helper de alto nível `services.communication.evolution.messages.send_media` já aplica:

- `image -> media.jpg`
- `video -> media.mp4`
- `audio -> media.mp3`
- `document -> media.pdf`

### Resultado validado

Fluxos reais já confirmados:

- `send_text` funcionando
- `send_audio` funcionando
- `send_media` funcionando para imagem com base64 puro e `fileName` com extensão correta
