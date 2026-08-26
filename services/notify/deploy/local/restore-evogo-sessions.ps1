<#
.SYNOPSIS
    Script utilitário para diagnóstico, reconexão e restauração de sessões do Evolution GO.

.DESCRIPTION
    Resolve automaticamente o erro 503 LICENSE_REQUIRED e religa sessões ativas do whatsmeow
    sem necessidade de novo pareamento por QR Code.

.PARAMETER Action
    status    : Verifica o estado da licença e das instâncias default e ieadpg.
    reconnect : Envia comando de connect/webhook para reconectar instâncias com sessão ativa.
    backup    : Gera backup SQL dos bancos evogo_auth e evogo_users.
#>

[CmdletBinding()]
param(
    [ValidateSet('status', 'reconnect', 'backup')]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'

$AdminKey = "621dbeb7c33b74cda265687b1d5e8d9e3f9a97ddfe2cbffec439124d884163e3"
$DefaultToken = "7f8bc651-578c-416b-b371-4639256b2574"
$IeadpgToken = "9bc13e9d-bd42-4c6f-b312-e5dfaf9728e1"

function Check-License {
    Write-Host "`n[1] Verificando licenca do Evolution GO..." -ForegroundColor Cyan
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:4000/license/status" -Method Get
        Write-Host "  -> Status: $($resp.status) | Instance: $($resp.instance_id)" -ForegroundColor Green
    }
    catch {
        Write-Host "  -> ERRO ao consultar licenca: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Check-Instances {
    Write-Host "`n[2] Verificando status das instancias..." -ForegroundColor Cyan
    
    $instances = @(
        @{ Name = 'default'; Token = $DefaultToken },
        @{ Name = 'ieadpg';  Token = $IeadpgToken }
    )

    foreach ($inst in $instances) {
        try {
            $headers = @{ apikey = $inst.Token }
            $res = Invoke-RestMethod -Uri "http://127.0.0.1:4000/instance/status" -Headers $headers -Method Get
            $conn = $res.data.Connected
            $logged = $res.data.LoggedIn
            $name = $res.data.Name
            
            if ($logged) {
                Write-Host "  -> $($inst.Name) ($name): ONLINE (Connected=$conn, LoggedIn=$logged)" -ForegroundColor Green
            } else {
                Write-Host "  -> $($inst.Name): DESCONECTADA (Connected=$conn, LoggedIn=$logged)" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "  -> $($inst.Name): ERRO: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

function Reconnect-Sessions {
    Write-Host "`n[+] Reconectando sessoes e vinculando webhooks..." -ForegroundColor Cyan
    
    $instances = @(
        @{ Name = 'default'; Token = $DefaultToken },
        @{ Name = 'ieadpg';  Token = $IeadpgToken }
    )

    foreach ($inst in $instances) {
        try {
            $headers = @{ 
                apikey = $inst.Token
                "Content-Type" = "application/json"
            }
            $body = @{
                webhookUrl = "http://notify-web:8000/v1/webhook/evolution/$($inst.Name)"
                subscribe = @("MESSAGE", "READ_RECEIPT", "HISTORY_SYNC")
                immediate = $false
            } | ConvertTo-Json

            $res = Invoke-RestMethod -Uri "http://127.0.0.1:4000/instance/connect" -Headers $headers -Method Post -Body $body
            Write-Host "  -> $($inst.Name): $($res.message)" -ForegroundColor Green
        }
        catch {
            Write-Host "  -> $($inst.Name): Falha ao reconectar: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Check-Instances
}

function Backup-Databases {
    $date = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $backupDir = Join-Path $PSScriptRoot "backups"
    if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
    
    $authFile = Join-Path $backupDir "evogo_auth_$date.sql"
    $usersFile = Join-Path $backupDir "evogo_users_$date.sql"

    Write-Host "`n[+] Gerando backup de evogo_auth e evogo_users..." -ForegroundColor Cyan
    cmd.exe /c "docker exec v7m-postgres pg_dump -U postgres evogo_auth > ""$authFile"""
    cmd.exe /c "docker exec v7m-postgres pg_dump -U postgres evogo_users > ""$usersFile"""
    Write-Host "  -> Backup salvo em $backupDir" -ForegroundColor Green
}

switch ($Action) {
    'status' {
        Check-License
        Check-Instances
    }
    'reconnect' {
        Reconnect-Sessions
    }
    'backup' {
        Backup-Databases
    }
}
