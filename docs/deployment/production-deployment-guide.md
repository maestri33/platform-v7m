# 🚀 Guia Canônico de Deploy em Produção & Operação — V7M Ecosystem

> **Documento Canônico:** docs/deployment/production-deployment-guide.md  
> **Escopo:** Infraestrutura de Produção Proxmox VE (pve-v7m), Cloudflare Edge, GitHub Container Registry (GHCR) e Hard-Lock de Segurança.  
> **Issue Vinculada:** #18

---

## 🏛️ 1. Topologia de Produção

O ecossistema V7M opera sob uma malha híbrida de alta performance:

```text
                          [ USUÁRIOS NA INTERNET ]
                                     │
                     ┌───────────────┴───────────────┐
                     │   Cloudflare Edge (DNS / WAF) │
                     └───────────────┬───────────────┘
                                     │
        ┌────────────────────────────┴────────────────────────────┐
        │                                                         │
 [ Cloudflare Pages (Astro 6) ]                           [ Proxmox WAN: 51.79.77.31 ]
 - maestri.group (Landing Promotor)                       (Orange Cloud Proxied / Full SSL)
 - supletivo.net.br (Landing Supletivo)                   - portal.maestri.group / admin.maestri.group (Porta 3003)
                                                          - app.maestri.group / hub.maestri.group (Porta 3003 - RFC 002)
                                                          - api.maestri.group (Porta 8001)
                                                          - app.supletivo.net.br (Porta 3020)
                                                          - api.supletivo.net.br (Porta 8001)
                                                          - mail.maestri.group (Grey Cloud -> Stalwart)
                                                          - webmail.maestri.group (Grey Cloud -> Bulwark)
```

---

## 🐳 2. Matriz de Imagens e Portas no CT 150

A cada merge na branch main, as imagens são atualizadas e executadas no host Proxmox CT 150:

| Serviço / App | Imagem no GHCR | Porta Host CT 150 | Exposição / Ingress |
| :--- | :--- | :---: | :--- |
| **Backend API** | `ghcr.io/maestri33/platform-v7m/backend:latest` | `8001` | 🌐 Público via NPM (`api.maestri.group`) |
| **Portal V7M Unificado** | `ghcr.io/maestri33/platform-v7m/admin:latest` | `3003` | 🌐 Público via NPM (`portal.maestri.group`, `admin.maestri.group`) |
| **App Supletivo** | `ghcr.io/maestri33/platform-v7m/app-supletivo:latest` | `3020` | 🌐 Público via NPM (`app.supletivo.net.br`) |
| **Notify Relay** | `ghcr.io/maestri33/platform-v7m/notify:latest` | `8000` | 🔒 **LAN Interna (Sem WAN / Fora do NPM)** |
| **Evolution GO** | `evoapicloud/evolution-go:0.7.2` | `4000` | 🔒 **LAN Interna (Sem WAN / Fora do NPM)** |

---

## 🛠️ 3. Procedimento Operacional no Servidor Proxmox (CT 150)

Para atualizar todos os containers no container Docker CT 150:

`ash
# 1. Conectar via SSH no CT 150 ou terminal Proxmox
pct enter 150

# 2. Navegar até o diretório do projeto
cd /opt/v7m

# 3. Autenticar no GHCR (caso ainda não esteja logado)
echo  | docker login ghcr.io -u maestri33 --password-stdin

# 4. Baixar as imagens mais recentes e reiniciar containers
docker compose pull
docker compose up -d --remove-orphans

# 5. Executar migrações do backend (se necessário)
docker exec v7m-backend-web python manage.py migrate --noinput

# 6. Checar saúde de todos os serviços
docker ps
`

---

## 🔒 4. Checklist de Resolução do Erro 522 no Cloudflare

Caso algum subdomínio apresente Error 522:

1. **Verificar DNS na Cloudflare:**
   - Confirmar se o registro A do subdomínio aponta para 51.79.77.31 (e não para o IP legado da Hetzner).
   - Confirmar se o ícone da nuvem está **Laranja (Proxied)** para apps e **Cinza (DNS Only)** para e-mails (mail e webmail).
2. **Verificar Modo SSL/TLS:**
   - Na aba **SSL/TLS** do domínio no Cloudflare, selecionar **Full** (não *Full Strict*, a menos que tenha instalado o *Cloudflare Origin Certificate* no NPM).
3. **Verificar Firewall do Proxmox:**
   - Confirmar que as portas 80 e 443 estão abertas para todos os ranges de IP da Cloudflare:
     173.245.48.0/20, 103.21.244.0/22, 103.22.200.0/22, 103.31.4.0/22, 141.101.64.0/18, 108.162.192.0/18, 190.93.240.0/20, 188.114.96.0/20, 197.234.240.0/22, 198.41.128.0/17, 162.158.0.0/15, 104.16.0.0/13, 104.24.0.0/14, 172.64.0.0/13, 131.0.72.0/22.

---

## 🛡️ 5. Primeiro Acesso (First-Run Bootstrap) & Ativação de Hard-Lock

Ao subir a plataforma pela primeira vez em produção:

1. Acesse https://admin.maestri.group/setup.
2. Complete as 5 etapas do Wizard:
   - Configuração do Administrador Master (CPF, Telefone, Senha segura).
   - Configuração de Preços e Metas da Bolsa Promotor Estudante.
   - Configuração das Chaves de Integração (Asaas, OmniRoute).
3. Ao finalizar, o backend grava ootstrapped: true e a rota /setup é **permanentemente trancada** com redirecionamento para /login.
