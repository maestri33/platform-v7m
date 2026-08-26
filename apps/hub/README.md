# V7M Hub

Portal operacional do coordenador em `hub.maestri.group`.

## Validação

```bash
npm ci
npm run build
npm run test:e2e
```

O navegador cobre login por telefone e OTP, bloqueio de não-coordenador, leitura
das filas do polo e uma decisão de candidato. A publicação acontece apenas
depois da CI da `main`, em release versionada com troca atômica do symlink
`/var/www/hub-v7m/current` e rollback automático.
