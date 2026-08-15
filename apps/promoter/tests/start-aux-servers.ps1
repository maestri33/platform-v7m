$ErrorActionPreference = "Stop"
$root = "C:\Users\maestri33\Documents\Workspace\v7m\app-v7m"

# Mata instância anterior (best effort).
Get-NetTCPConnection -LocalPort 3100 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort 8765 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

# Mock backend on 8765
$p1 = Start-Process -FilePath "C:\Program Files\nodejs\node.exe" `
  -ArgumentList @("tests/e2e/mock-backend.mjs") `
  -WorkingDirectory $root `
  -RedirectStandardOutput (Join-Path $root "tests\mock-backend.out.log") `
  -RedirectStandardError  (Join-Path $root "tests\mock-backend.err.log") `
  -PassThru -NoNewWindow

# Dev server on 3100 (porta 3000 está ocupada por Hermes WhatsApp bridge).
# Usa cmd /c start para desacoplar do processo pai (sem NoNewWindow que permite
# que o Playwright parent o mate quando terminar).
$env:APP_ENV = "test"
$env:BACKEND_URL = "http://127.0.0.1:8765"
$env:OMNIROUTE_BASE_URL = "http://127.0.0.1:8765"
$env:OMNIROUTE_API_KEY = "e2e-key"
$env:OMNIROUTE_EDUCATION_MODEL = "e2e-education"

# Cria um .bat que inicia o dev server com stdin redirecionado de NUL
# para que ele não dependa de TTY/parent.
$batPath = Join-Path $root "tests\dev-server-3100.bat"
$nodePath = "C:\Program Files\nodejs\node.exe"
$batContent = @"
@echo off
set APP_ENV=test
set BACKEND_URL=http://127.0.0.1:8765
set OMNIROUTE_BASE_URL=http://127.0.0.1:8765
set OMNIROUTE_API_KEY=e2e-key
set OMNIROUTE_EDUCATION_MODEL=e2e-education
cd /d "$root"
"$nodePath" "node_modules\next\dist\bin\next" dev --hostname 127.0.0.1 --port 3100 > "$root\tests\dev-server-3100.out.log" 2> "$root\tests\dev-server-3100.err.log"
"@
Set-Content -Path $batPath -Value $batContent -Encoding ASCII

# Inicia via cmd /c start (não bloqueia, não herda TTY, sobrevive).
$proc = Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", "start", "/B", "cmd", "/c", $batPath `
  -WindowStyle Hidden `
  -PassThru

Write-Host "mock-backend pid=$($p1.Id)  dev-server-launched pid=$($proc.Id)"
