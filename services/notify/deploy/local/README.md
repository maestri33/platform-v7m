# Ambiente local completo

Requisito: Docker Desktop em execucao. O fluxo nao cria instancias, nao conecta
WhatsApp e nao envia mensagens. O Compose fixa `CONNECT_ON_STARTUP=false` e
`TEST_MODE=1`; o segundo valor nao pode ser desligado por `.env` nesta stack.

```powershell
# Baixa imagens e constroi o notify (opcional; start tambem faz o necessario)
.\deploy\local\notify-local.ps1 setup

# Sobe e verifica notify, worker, PostgreSQL, Redis e Evolution GO
.\deploy\local\notify-local.ps1 start

# Repete os testes ou coleta estado e logs
.\deploy\local\notify-local.ps1 verify
.\deploy\local\notify-local.ps1 diagnose

# Para sem apagar os volumes
.\deploy\local\notify-local.ps1 stop
```

URLs locais: notify `http://127.0.0.1:8000` e Evolution GO `http://127.0.0.1:4000`.

As credenciais e portas possuem defaults somente locais. Para sobrescrever,
copie `.env.example` para `.env` e altere os valores. Nao use esses defaults em
um ambiente acessivel pela rede.
