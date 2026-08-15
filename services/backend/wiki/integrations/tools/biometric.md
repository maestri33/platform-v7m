# integrations/tools/biometric — biometria facial (face-match documento × selfie)

> Tool de **biometria facial**: compara o rosto do **documento** com a **selfie** e devolve um veredito.
> Consumo **in-process** (sem endpoint), como `cep`/`cpf`. App Django (`app_label="biometric"`) porque
> **guarda dado** (templates + auditoria). Provado real 2026-06-05 (CNH×selfie ≈0.42–0.55 → aprovado).

## Para que serve
Validar identidade no funil do **aluno** (`enrollment`) e do **colaborador** (`candidate`): o rosto da
selfie tem que **bater** com o rosto do documento. Roda **junto** com a validação de selfie por IA
(liveness/anti-foto-de-foto) — é o **"somar"**: o funil só avança se **os dois** passarem.

## Como funciona
- **InsightFace** (ArcFace `buffalo_l`) em **CPU** (`onnxruntime`, sem GPU). Modelo carregado
  **preguiçoso** (1º uso, nunca no boot). Pesos (~298MB) ficam **FORA do repo** (`<mvp>/models/insightface`,
  config `BIOMETRIC_MODEL_ROOT`).
- **Persistente** (a "biometria do perfil"): a foto-frente do RG/CNH vira um **template** salvo
  (`FaceBiometric source=document`) no upload; a selfie compara com ele e **também é salva**
  (`source=selfie`) — a biometria do usuário **expande** a cada captura.
- **Score** = cosseno dos embeddings (512-d). ⚠️ Escala do ArcFace ~0.2–0.7 (mesma pessoa ~0.4–0.7;
  pessoas diferentes <0.3) — **não** é "%". Banda **config no `.env`**.

## Veredito (3 estados — espelha `users.roles._selfie`)
| score | status | efeito no funil |
|---|---|---|
| ≥ `BIOMETRIC_MATCH_THRESHOLD` (0.35) | `approved` | avança |
| ≥ `BIOMETRIC_REVIEW_THRESHOLD` (0.28) | `review` | **bloqueia** → coordenador decide (sim/não) |
| < review | `rejected` | manda refazer a selfie |
Fail-safe: modelo fora / sem rosto / sem documento → `review` (nunca passa em silêncio).

## Modelos (`models.py`)
- **`FaceBiometric`** — template por captura: `user` FK, `source` (document/selfie), `embedding` 512-d,
  `det_score`, `image_path`, `metadata`. Herda `core.ExternalIdModel`.
- **`FaceVerification`** — auditoria de cada comparação: `score`, `threshold`, `approved`, `status`,
  `reference` (doc), `probe` (selfie), `liveness`. Nada é descartado.

## Interface (`service.py`)
- `enroll_face(user, image_path, source, caller)` — salva um template.
- `try_enroll_document(user, slot, image_path, caller)` — best-effort no upload da frente (não quebra o upload).
- `verify_identity(user, selfie_image_path, caller) -> FaceMatchResult` — compara a selfie com o template
  do documento + salva a selfie + grava a auditoria.
- `compare_images(doc, selfie)` — comparação direta sem DB (calibração/command).

Fiação no funil: `users.roles._selfie.add_face_match` (+`combine`, pior-vence) é chamado por
`candidate`/`enrollment` no `set_selfie`; o enroll do documento entra no `upload_*_photo`.

## Config (`.env` / `settings.py`)
`BIOMETRIC_ENABLED` (liga o gate) · `BIOMETRIC_MATCH_THRESHOLD`=0.35 · `BIOMETRIC_REVIEW_THRESHOLD`=0.28
(calibrados com par real) · `BIOMETRIC_MODEL_NAME`=buffalo_l · `BIOMETRIC_MODEL_ROOT` (FORA do backend) ·
`BIOMETRIC_LIVENESS_PROVIDER` (seam p/ FaceTec/Unico/CAF no futuro).

## Liveness
`liveness.py` é um **seam plugável** — hoje stub local (`{passed:True, provider:local}`); a arquitetura
permite trocar por FaceTec/Unico/CAF sem mexer no negócio.

## Comandos
- `manage.py biometric_health` — deps + carrega o modelo (CPU) + liveness; grava `ValidationCheck`.
- `manage.py biometric_test <doc> <selfie>` — compara duas imagens e imprime score/veredito (calibração).

## Checks
`biometric.W001` (deps) · `W002` (modelo não baixado) · `W003` (dir) — **só AVISAM** (não travam o boot;
biometria é apoio do funil).

## Notas
- Ruído `pthread_setaffinity_np` do onnxruntime no load (LXC com cpuset restrito): **não-fatal**, uma vez só.
- Decisões e calibração: `.claude/plan/11-biometria-facial.md` · provas reais: `.claude/tests/11-biometria-facial.md`.
