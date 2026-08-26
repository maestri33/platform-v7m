# v7m-ops

Repositório de operações dos apps **supletivo** e **v7m** (pve-prod).

As issues aqui são abertas automaticamente pelo **watcher** (LXC 3040 / 10.1.30.40),
um Claude Code headless que monitora os logs de produção:

- **Triagem** (cron a cada 10 min): coleta logs novos dos 8 CTs alvo via SSH,
  pré-filtra padrões de erro e, se algo suspeito aparece, investiga e relata.
  Erro de um app específico → issue no repo do próprio app. Achados transversais → aqui.
- **Auditoria** (diária, 07h): compara configs/serviços entre os CTs e relata
  melhorias e incoerências (sempre aqui).

Labels: `watcher` (tudo), `anomalia`, `melhoria`, `coesao`, `app:<nome>`.

O watcher é **somente leitura** em produção: investiga e relata, nunca corrige.
Scripts em `/opt/watcher/` na LXC 3040; logs em `/var/lib/watcher/watcher.log`.

CTs monitorados: 30100 landing-supletivo, 30101 backend, 30102 app-supletivo,
30103 page-v7m, 30109 admin-v7m, 30110 app-v7m, 30111 hub-v7m, 3037 bot-supletivo.
