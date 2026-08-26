# ==============================================================================
# V7M ECOSYSTEM - BOOTSTRAP SCRIPT (Windows / PowerShell)
# ==============================================================================

[CmdletBinding()]
param (
    [switch]$Docker,
    [switch]$Interactive
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $RootDir "backend-v7m"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " V7M ECOSYSTEM - BOOTSTRAP INICIAL" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Garantir arquivos de ambiente
$RootEnv = Join-Path $RootDir ".env"
$BackendEnv = Join-Path $BackendDir ".env"

if (-not (Test-Path $RootEnv)) {
    if (Test-Path (Join-Path $RootDir ".env.example")) {
        Copy-Item (Join-Path $RootDir ".env.example") $RootEnv
        Write-Host "[OK] Criado .env na raiz" -ForegroundColor Green
    }
}

if (-not (Test-Path $BackendEnv)) {
    if (Test-Path (Join-Path $BackendDir ".env.example")) {
        Copy-Item (Join-Path $BackendDir ".env.example") $BackendEnv
        Write-Host "[OK] Criado backend-v7m/.env" -ForegroundColor Green
    }
}

# 2. Entrada interativa se solicitado
if ($Interactive) {
    Write-Host "--- CONFIGURACAO DA CONTA-MAE (VICTOR / BOSS) ---" -ForegroundColor Yellow
    $staffName = Read-Host "Nome Completo [Victor Maestri]"
    if ([string]::IsNullOrWhiteSpace($staffName)) { $staffName = "Victor Maestri" }

    $staffCpf = Read-Host "CPF Real (apenas numeros)"
    $staffPhone = Read-Host "WhatsApp Real com DDD (ex: 11999999999)"
    $staffEmail = Read-Host "E-mail Real"
    $staffPix = Read-Host "Chave Pix Real"
    $staffPass = Read-Host "Senha do Superuser"

    if ($staffCpf -and $staffPhone) {
        $lines = Get-Content $BackendEnv
        $lines = $lines -replace "^DEFAULT_STAFF_NAME=.*", "DEFAULT_STAFF_NAME=$staffName"
        $lines = $lines -replace "^DEFAULT_STAFF_CPF=.*", "DEFAULT_STAFF_CPF=$staffCpf"
        $lines = $lines -replace "^DEFAULT_STAFF_PHONE=.*", "DEFAULT_STAFF_PHONE=$staffPhone"
        $lines = $lines -replace "^DEFAULT_STAFF_EMAIL=.*", "DEFAULT_STAFF_EMAIL=$staffEmail"
        $lines = $lines -replace "^DEFAULT_STAFF_PIX=.*", "DEFAULT_STAFF_PIX=$staffPix"
        $lines = $lines -replace "^DEFAULT_STAFF_PASSWORD=.*", "DEFAULT_STAFF_PASSWORD=$staffPass"
        Set-Content -Path $BackendEnv -Value $lines
        Write-Host "[OK] Credenciais salvas no backend-v7m/.env" -ForegroundColor Green
    }
}

# 3. Execucao de Migracoes e Seed
Write-Host ""
Write-Host "--- EXECUTANDO MIGRACOES E SEED DE DADOS ---" -ForegroundColor Yellow

if ($Docker) {
    Write-Host "Executando via Docker Compose..." -ForegroundColor Cyan
    Push-Location $RootDir
    try {
        docker compose run --rm backend-web python manage.py migrate
        docker compose run --rm backend-web python manage.py seed_defaults
    } finally {
        Pop-Location
    }
} else {
    Write-Host "Executando localmente via Python / uv..." -ForegroundColor Cyan
    Push-Location $BackendDir
    try {
        if (Get-Command "uv" -ErrorAction SilentlyContinue) {
            uv run python manage.py migrate --noinput
            uv run python manage.py seed_defaults
        } else {
            python manage.py migrate --noinput
            python manage.py seed_defaults
        }
    } finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host " [OK] BOOTSTRAP CONCLUIDO COM SUCESSO!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor White
Write-Host " 1. Subir servicos: docker compose up -d" -ForegroundColor Cyan
Write-Host " 2. Dashboard Admin: http://localhost:3003/configuracoes" -ForegroundColor Cyan
Write-Host " 3. App Promotor: http://localhost:3001" -ForegroundColor Cyan
Write-Host " 4. Tunel Webhook: .\\scripts\\tunnel.ps1" -ForegroundColor Cyan
