# IEADPG · Jardim Amália — site scroll-world

Landing cinematográfica da Igreja Evangélica Assembleia de Deus — Jardim Amália
(Ponta Grossa · PR). O visitante rola a página e "voa": janela do avião → nuvens →
revelação do logo → entardecer → cidade à noite → chegada na igreja → fachada com
convite via WhatsApp.

**Importante:** o prédio mostrado nos vídeos é o **projeto da nova casa (em
construção)** — o site apresenta o sonho, não o prédio pronto. A copy inteira foi
escrita nesse enquadramento ("nosso sonho em construção").

## Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## Como funciona

- `app/page.tsx` — página `use client` com fallback prerenderizado (indexável sem JS): config das 7 cenas (copy, acentos, pacing)
  e mount da engine via `<Script>`.
- `public/scroll-world/scrub-engine.js` — engine de scrub por scroll (vanilla JS,
  carrega cada clipe como Blob e navega `currentTime`). As emendas trocam
  direto — o frame-lock entre clipes é o que sustenta a continuidade; a config
  `crossfade` da engine é inerte (cena ativa fica opaca por cima).
- `public/scroll-world/*.mp4` — 7 clipes no spec de scrub: h264 `yuv420p`, sem
  áudio, GOP 8, `+faststart`, crf 24 (validado contra banding nas nuvens). **Não recodifique sem manter GOP curto** —
  GOP longo trava o scrub.
- `public/scroll-world/*-m.mp4` — trilha mobile (540p, GOP 4, crf 27,
  ~16 MB no total — resolução baixa de propósito: decode leve é o que faz
  o scrub deslizar em celular): a engine escolhe sozinha em telas ≤860px / touch via `clipMobile`.
- `app/icon.png` (96px) — chama recortada do logo —, `app/apple-icon.png` (180px) e `public/favicon.ico`
  (16/32/48) — o `.ico` fica em `public/` de propósito: atende `/favicon.ico`
  legado sem gerar um segundo `<link rel="icon">` conflitante.
- `public/scroll-world/*.webp` / `*-m.webp` — posters servidos (primeiro frame de cada cena, desktop e mobile); os `*.jpg` ficam como fonte de re-encode.
- `app/globals.css` — tema com as cores extraídas do logo (`public/ieadpg-logo.png`):
  chama `#e60a0a → #fa5a0a → #faaa0a`, ouro `#e6d282` / `#d2b264` / `#b4843c`,
  fundo `#0b0b0b`. Overrides de contraste da engine pro tema escuro.
- `app/opengraph-image.jpg` (+ `opengraph-image.alt.txt`) — preview de
  compartilhamento (render da fachada).

## Conteúdo real (fonte: ieadpg.org)

- Cultos: Domingo 19h (Celebração) · Quarta 20h (Alinhamento)
- Endereço: Rua Paulina Oliveira Gomes, 1071 — Jardim Amália, Ponta Grossa/PR
- WhatsApp: wa.me/5542999384069 · Instagram: @ieadpg.amalia
- E-mail: amalia@ieadpg.org · Facebook: Ieadpg Jardim Amália
  (capturados do DOM real de ieadpg.org via browser — o site é JS-rendered,
  fetch simples não os enxerga)

## Deploy

`npm run build` gera tudo estático (rota `/` prerenderizada). Vercel/Netlify
funcionam direto. Os vídeos somam ~64 MB em `public/` (48 MB desktop + 16 MB
mobile); cada visitante baixa só a trilha do seu dispositivo, e sob demanda.
Se precisar apertar mais, suba o crf mantendo `-g 8` (desktop) / `-g 4` (mobile),
`-keyint_min` igual ao `-g`, `-sc_threshold 0 -an -movflags +faststart`.
