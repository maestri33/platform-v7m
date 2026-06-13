#!/usr/bin/env bash
#
# Drive an enrollment to the end (awaiting_release) against the live backend,
# exercising the exact v2 contract the front uses. Idempotent: reads
# /enrollment/me and only does the section the server currently expects.
#
# Usage — provide a token, OR let the script log in from a fresh OTP you trigger:
#   # A) you already have a JWT:
#   TOKEN=<enrollment-jwt> RG_FULL=~/rg.jpg SELFIE=~/selfie.jpg ./scripts/drive-matricula.sh
#   # B) you triggered an OTP (front "reenviar" or check) and paste it here:
#   EXTERNAL_ID=<uuid> OTP=<6-digits> RG_FULL=~/rg.jpg SELFIE=~/selfie.jpg ./scripts/drive-matricula.sh
#
# Either RG_FULL (whole document) OR RG_FRONT (+optional RG_BACK) is required.
# NOTE: the script never SENDS an OTP — you trigger it; it only exchanges the code you paste.
set -euo pipefail

BASE="${BASE:-http://localhost:3000}"          # through the Next proxy; or http://10.1.20.30
RG_FRONT="${RG_FRONT:-}"; RG_BACK="${RG_BACK:-}"; RG_FULL="${RG_FULL:-}"
SELFIE="${SELFIE:-}"
CEP="${CEP:-01001000}"; NUMERO="${NUMERO:-770}"
LAST_SCHOOL="${LAST_SCHOOL:-Escola Estadual Brasil}"
LAST_YEAR="${LAST_YEAR:-8º ano}"; LAST_WHEN="${LAST_WHEN:-2015}"

CL="/api/v1/clients"
jget(){ python3 -c "import sys,json;d=json.load(sys.stdin) or {};print(d.get('$1','') if isinstance(d,dict) else '')"; }
pp(){ python3 -m json.tool 2>/dev/null || cat; }

# Resolve a token: either given, or exchanged from EXTERNAL_ID + OTP (you triggered the OTP).
TOKEN="${TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  [[ -n "${EXTERNAL_ID:-}" && -n "${OTP:-}" ]] || { echo "Defina TOKEN=<jwt>  ou  EXTERNAL_ID=<uuid> OTP=<código>"; exit 1; }
  TOKEN=$(curl -s -X POST -H 'Content-Type: application/json' \
    -d "{\"external_id\":\"${EXTERNAL_ID}\",\"otp\":\"${OTP}\"}" "${BASE}${CL}/auth/login" | jget access_token)
  [[ -n "$TOKEN" ]] || { echo "login falhou (OTP expirado/rotacionado? dispare outro e repasse)"; exit 1; }
  echo "login ok"
fi
AUTH=(-H "Authorization: Bearer ${TOKEN}")

me(){ curl -s "${AUTH[@]}" "${BASE}${CL}/enrollment/me"; }
status(){ me | jget status; }

say(){ printf '\n\033[1;34m== %s ==\033[0m\n' "$*"; }

drive_rg(){
  say "RG — upload + polling"
  if [[ -n "$RG_FULL" ]]; then
    curl -s "${AUTH[@]}" -F "file=@${RG_FULL}" "${BASE}${CL}/enrollment/documents/rg/photo/full" | pp
  elif [[ -n "$RG_FRONT" ]]; then
    curl -s "${AUTH[@]}" -F "file=@${RG_FRONT}" "${BASE}${CL}/enrollment/documents/rg/photo/front" | pp
    [[ -n "$RG_BACK" ]] && curl -s "${AUTH[@]}" -F "file=@${RG_BACK}" "${BASE}${CL}/enrollment/documents/rg/photo/back" | pp
  else
    echo "ERRO: defina RG_FULL ou RG_FRONT"; exit 1
  fi
  for i in $(seq 1 24); do
    local v; v=$(curl -s "${AUTH[@]}" "${BASE}${CL}/enrollment/documents/rg" | jget validation_status)
    echo "  validation_status=$v"
    [[ "$v" == approved || "$v" == rejected || "$v" == review ]] && break
    sleep 2.5
  done
  local rg; rg=$(curl -s "${AUTH[@]}" "${BASE}${CL}/enrollment/documents/rg"); echo "$rg" | pp
  local vs; vs=$(echo "$rg" | jget validation_status)
  [[ "$vs" != approved ]] && { echo ">> RG não aprovado ($vs). Ajuste a foto."; exit 2; }
  # completa missing_fields típicos (marital_status, nationality) + número se faltar
  say "RG — PATCH missing_fields"
  curl -s "${AUTH[@]}" -X PATCH -H 'Content-Type: application/json' \
    -d "{\"marital_status\":\"solteiro\",\"nationality\":\"brasileira\",\"number\":\"${RG_NUMBER:-000000000}\"}" \
    "${BASE}${CL}/enrollment/documents/rg" | pp
}

drive_address(){
  say "ENDEREÇO — POST cep"
  curl -s "${AUTH[@]}" -X POST -H 'Content-Type: application/json' \
    -d "{\"cep\":\"${CEP}\"}" "${BASE}${CL}/enrollment/address" | pp
  say "ENDEREÇO — PATCH número"
  curl -s "${AUTH[@]}" -X PATCH -H 'Content-Type: application/json' \
    -d "{\"number\":\"${NUMERO}\"}" "${BASE}${CL}/enrollment/address" | pp
}

drive_education(){
  say "EDUCAÇÃO — POST"
  curl -s "${AUTH[@]}" -X POST -H 'Content-Type: application/json' \
    -d "{\"last_year_studied\":\"${LAST_YEAR}\",\"last_school\":\"${LAST_SCHOOL}\",\"last_year_when\":\"${LAST_WHEN}\"}" \
    "${BASE}${CL}/enrollment/education" | pp
}

drive_selfie(){
  [[ -z "$SELFIE" ]] && { echo "ERRO: defina SELFIE=<arquivo>"; exit 1; }
  say "SELFIE — upload + polling"
  curl -s "${AUTH[@]}" -F "file=@${SELFIE}" "${BASE}${CL}/enrollment/selfie" | pp
  for i in $(seq 1 24); do
    local s; s=$(curl -s "${AUTH[@]}" "${BASE}${CL}/enrollment/selfie" | jget status)
    echo "  selfie status=$s"
    [[ "$s" == approved || "$s" == rejected || "$s" == review ]] && break
    sleep 2.5
  done
  curl -s "${AUTH[@]}" "${BASE}${CL}/enrollment/selfie" | pp
}

say "estado inicial"; me | pp
for _ in $(seq 1 8); do
  st=$(status); echo ">> status atual: $st"
  case "$st" in
    rg|documents)        drive_rg ;;
    address)             drive_address ;;
    education)           drive_education ;;
    selfie)              drive_selfie ;;
    awaiting_release|completed) say "FIM — $st"; me | pp; exit 0 ;;
    "")                  echo "sem status (token inválido?)"; exit 1 ;;
    *)                   echo "status inesperado: $st"; exit 1 ;;
  esac
done
say "estado final"; me | pp
