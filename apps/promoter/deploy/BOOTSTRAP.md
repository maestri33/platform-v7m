# Deploy do app-promotor — bootstrap único (depois é CI/CD automático)

Padrão das outras LXCs do projeto (igual ao backend, plan/17): **runner self-hosted
por LXC + `on: workflow_run` (CI → Deploy) + systemd + rollback + issue em falha.**

O front co-loca no **LXC `landing-promotor` (CT 30107)** — já tem `node v22` + um
runner + nginx. Caddy (CT 200) tem `app.v7m.org` como placeholder reservado.

## 1. Runner self-hosted pro repo app-promotor (no CT 30107)

> Precisa de um **registration token** do GitHub (Settings → Actions → Runners →
> New self-hosted runner) — por isso é passo do Victor, não dá pra automatizar.

```bash
# dentro do CT 30107:
cd /opt && mkdir -p actions-runner-app && cd actions-runner-app
curl -o r.tar.gz -L https://github.com/actions/runner/releases/latest/download/actions-runner-linux-x64.tar.gz
tar xzf r.tar.gz
./config.sh --url https://github.com/maestri33/app-promotor \
            --token <REGISTRATION_TOKEN> \
            --labels app-promotor --name app-promotor-runner --unattended
sudo ./svc.sh install && sudo ./svc.sh start
```

## 2. Checkout inicial + serviço systemd (no CT 30107)

```bash
# clone (repo privado → usa o gh/token do runner ou um deploy key):
git clone https://github.com/maestri33/app-promotor.git /opt/app-promotor
cd /opt/app-promotor && git checkout main
npm ci && npm run build
cp -r .next/static .next/standalone/.next/static
[ -d public ] && cp -r public .next/standalone/public

# serviço:
cp deploy/app-promotor.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now app-promotor
curl -fsS http://127.0.0.1:3001/ >/dev/null && echo "app no ar na :3001"

# sudo sem senha pro runner reiniciar o serviço (o deploy.yml chama `sudo systemctl restart`):
echo '%sudo ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart app-promotor' > /etc/sudoers.d/app-promotor
```

## 3. Caddy: ligar app.v7m.org → CT 30107:3001 (no CT 200)

⚠️ **Gotcha (memória): no CT 200, aplicar config = `systemctl restart caddy`** —
`reload` quebra (admin off). Sempre **backup + `caddy validate` ANTES**.

Trocar o bloco placeholder no `/etc/caddy/Caddyfile`:

```caddy
# de:
app.v7m.org {
	respond "Em breve — app V7M" 200
}
# para:
app.v7m.org {
	reverse_proxy 10.1.30.107:3001
}
```

```bash
cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak.app-promotor-$(date +%Y%m%d)
# (editar o bloco)
caddy validate --config /etc/caddy/Caddyfile && systemctl restart caddy
```

## 4. Depois disso

Todo push na `main` → CI (tsc+lint+build) → Deploy (build+restart+health) sozinho.
Teste externo de `https://app.v7m.org` sai pelo exit-node Brasil (skill
`testar-url-via-exit-node`), não por config no host.

## ⚠️ Pendência de BACKEND (não é do front): seed da conta-mãe no DB de prod

`backend.v7m.live` está no ar mas o `POST /auth/check` da conta-mãe deu
`found:false` → o **DB de prod (CT 2100) não tem `seed_defaults` rodado**. Sem isso
o funil do promotor (ref/hub) não fecha. Rodar no LXC backend-v7m:
`python manage.py seed_defaults` — **mexe a identidade+pix da conta-mãe → decisão do Victor.**
