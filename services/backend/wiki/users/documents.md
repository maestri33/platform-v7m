# users/documents — documentos (sub-módulo do users, ciclo 3b)

> Agregado de documentos do usuário (spec documents; VISAO §serviços-de-apoio). `Document` é a raiz
> **1-1 com o `User`**, criada no provisionamento; os sub-docs são **1-1 com o `Document`** (FK
> `document_id`, §4) e **nascem todos junto, com campos null**. Totalmente **DMZ**.
> Só **RG / CNH / certidão / serviço-militar** (palavra do dono) — WorkCard/Passport do legado ficam de fora.

## Models (`documents/models.py`, app_label `users`)
- **`Document`** (`users_document`): 1-1 `User`, timestamps. Raiz/âncora.
- **`RG`** (`users_document_rg`): `number`, `issuing_agency`, `issue_date`, `front_photo`, `back_photo`.
- **`CNH`** (`users_document_cnh`): `number`, `category`, `date_of_birth`, `expires_on`,
  `national_register`, `front_photo`, `back_photo` (porte do conjunto do legado — pedido do dono).
- **`Certificate`** (`users_document_certificate`): `kind` (nascimento/casamento/óbito — **uma por
  document**), `number`, `registry_office`, `book`, `page`, `entry`, `issue_date`, `photo`.
- **`Military`** (`users_document_military`): `number`, `series`, `category`, `ra`, `photo` — **criado
  pra todos, mas só `gender='M'` preenche** (regra do dono). Todos os campos null.
- **Foto** = path relativo no DB; arquivo físico em `media/documents/<external_id>/<slot>.<ext>`.

## Endpoints DMZ (`/users/documents/…`)
- `GET <external_id>/` — Document + sub-docs aninhados.
- `PUT|PATCH <external_id>/` — atualiza os campos enviados de cada sub-doc (datas em `AAAA-MM-DD`).
  Preencher `military` com `gender≠M` → `422 MILITARY_NOT_APPLICABLE`.
- `POST <external_id>/photo/<slot>/` — **upload multipart** (campo `file`); valida slot + MIME
  (jpeg/png/webp) + tamanho (`MAX_UPLOAD_MB`); grava em `media/` e salva o path. Slots: `rg_front`,
  `rg_back`, `cnh_front`, `cnh_back`, `certificate_photo`, `military_photo`.
- `DELETE <external_id>/photo/<slot>/` — remove arquivo + limpa o campo.

## interface (`documents/interface/`)
`create_empty` (provisionamento: Document + 4 sub-docs null), `get_by_external_id`, `update`,
`upload_photo`, `delete_photo`.

## Provisionamento
Na transação do `register` (`auth/service.py`): `documents_iface.create_empty(user)` cria o Document
+ RG/CNH/Certificate/Military vazios. Atômico com Profile/Address/role.

## Config (`.env`)
`MAX_UPLOAD_MB` (default 10) — limite do upload de imagem.

## Rabo pra trás (spec nova)
- **Selfie** (validação tipo-assinatura) → fica pro ciclo `candidate`/`enrollment` (`specs/selfie.md`).

## Teste real
`.claude/tests/3b-users-address-documents-profiles.md` — GET null → PUT RG → upload PNG real (gravado
em disco, `exists=True`) → gate de gênero (M ok, F recusa 422). Tudo REAL.
