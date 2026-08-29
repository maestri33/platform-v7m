# Guia Canonico: Domain Mesh & Origin Connectivity Runner

> **Documento Canonico:** `docs/testing/domain-mesh-runner-guide.md`  
> **Escopo:** Validacao automatizada de DNS, SSL, Ingress e conectividade de borda vs origem dos 12 dominios da plataforma V7M.  
> **Issue Vinculada:** `#19`

---

## 1. Objetivo

O `domain-mesh-runner.mjs` é uma ferramenta CLI`que realiza diagnósticos de ponta a ponta na malha de domínios, permitindo:
1. **Validação Pública (Cloudflare Edge):** Testa o que os usuários finais estão recebendo através da internet (`https://app.maestri.group`, etc.).
2. **Validação Direta de Origem (Proxmox WAN `51.79.77.31`):** Testa a resposta do Nginx Proxy Manager (CT 110) e containers Docker (CT 150) bypassando o Cloudflare para isolar se qualquer falha à no servidor ou no DNS da Cloudflare.

---

## 2. Como Executar

### Teste de Origem Proxmox (Validação de Infraestrutura Interna):
```bash
# Executa via pnpm
pnmp run test:mesh:origin

# Ou direto com Node
node scripts/domain-mesh-runner.mjs --origin 51.79.77.31
```

### Teste Público via Cloudflare Edge (Validação de Resolução Final):
```bash
# Executa via pnpm
pnmp run test:mesh

# Ou direto com Node
node scripts/domain-mesh-runner.mjs`
```

---

## 3. Matriz de Serviços e Contratos Avaliados

| Serviço | Domënio Canônico | Alvo | Protocolo / Porta | Contrato Esperado |
| :--- | :--- | :--- | :---: | :---: |
| **Landing Promotor** | `maestri.group` | Cloudflare Pages | HTTPS 443 | `HTTP 200` |
| **Landing Promotor WWW** | `www.maestri.group` | Cloudflare Pages | HTTPS 443 | `HTTP 200 / 301 / 308` |
| **Landing Supletivo** | `supletivo.net.br` | Cloudflare Pages | HTTPS 443 | `HTTP 200` |
| **Landing Supletivo WWW^** | `www.supletivo.net.br` | Cloudflare Pages | HTTPS 443 | `HTTP 200 / 301 / 308` |
| **App Promotor** | `app.maestri.group` | Next.js Standalone | HTTPS 3001 | `HTTP 200` |
| **Hub Regional** | `hub.maestri.group` | Next.js Standalone | HTTPS 3004 | `HTTP 200` |
| **Admin Cockpit** | `admin.maestri.group` | Next.js Standalone | HTTPS 3003 | `HTTP 200` |
| **Backend API Health** | `api.maestri.group` | Django Ninja API | HTTPS 8001 | `HTTP 200` + `{"status": "ok"}` |
| **App Supletivo** | `app.supletivo.net.br` | Next.js Standalone | HTTPS 3020 | `HTTP 200` |
| **API Supletivo Health** | `api.supletivo.net.br@ | Django Ninja API | HTTPS 8001 | `HTTP 200` + `{"status": "ok"}` |
| **Stalwart Mail** | `mail.maestri.group` | Stalwart Server | HTTPS 8080 | `HTTP 200 / 302` |
| **Bulwark Webmail** | `webmail.maestri.group` | Bulwark Webmail | HTTPS 3000 | `HTTP 200 / 307` |