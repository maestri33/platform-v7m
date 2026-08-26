# ==============================================================================
# V7M ECOSYSTEM · CLOUDFLARE TUNNEL SCRIPT (Windows / PowerShell)
# ==============================================================================
# Expõe o backend local de forma segura através de túnel HTTPS Cloudflare
# para permitir que webhooks de Bancos (Asaas), WhatsApp e Provedores de IA
# consigam bater na sua máquina de desenvolvimento.
# ==============================================================================

[CmdletBinding()]
param (
    [int]$BackendPort = 8001,
    [string]$CustomUrl = ""
)

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " 🌐 CLOUDFLARE TUNNEL · WEBHOOKS & INTEGRAÇÕES V7M" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar instalação do cloudflared
$cloudflaredCmd = Get-Command "cloudflared" -ErrorAction SilentlyContinue

if (-not $cloudflaredCmd) {
    Write-Host "❌ cloudflared não foi encontrado no PATH da máquina." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para instalar rapidamente no Windows via Winget:" -ForegroundColor White
    Write-Host "   winget install --id Cloudflare.cloudflared" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ou baixe o executável oficial:" -ForegroundColor White
    Write-Host "   https://github.com/cloudflare/cloudflared/releases/latest" -ForegroundColor Cyan
    Write-Host ""
    
    $installNow = Read-Host "Deseja que eu tente instalar via winget agora? (S/N)"
    if ($installNow -match "^[SsYy]") {
        winget install --id Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements
        $cloudflaredCmd = Get-Command "cloudflared" -ErrorAction SilentlyContinue
    }

    if (-not $cloudflaredCmd) {
        Write-Error "Por favor, instale o cloudflared e execute este script novamente."
        return
    }
}

$targetUrl = if ($CustomUrl) { $CustomUrl } else { "http://localhost:$BackendPort" }

Write-Host "Iniciando túnel para o destino: " -NoNewline
Write-Host $targetUrl -ForegroundColor Green
Write-Host ""
Write-Host "📍 Rotas de Webhooks configuradas para você usar nas plataformas:" -ForegroundColor Gray
Write-Host "   - Asaas Webhook:   <URL_DO_TUNEL>/api/v1/integrations/webhooks/asaas/" -ForegroundColor Cyan
Write-Host "   - WhatsApp Notify: <URL_DO_TUNEL>/api/v1/integrations/webhooks/whatsapp/" -ForegroundColor Cyan
Write-Host "   - Health Check:    <URL_DO_TUNEL>/api/v1/health/healthz" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione Ctrl+C para encerrar o túnel a qualquer momento." -ForegroundColor Yellow
Write-Host "------------------------------------------------------" -ForegroundColor DarkGray

cloudflared tunnel --url $targetUrl
