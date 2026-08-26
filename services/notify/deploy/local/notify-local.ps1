[CmdletBinding()]
param(
    [ValidateSet('setup', 'start', 'diagnose', 'verify', 'stop')]
    [string]$Action = 'start',
    [int]$TimeoutSeconds = 240
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ComposeArgs = @('compose', '--project-directory', $RepoRoot, '-f', (Join-Path $RepoRoot 'compose.yaml'))

function Invoke-Docker {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    & docker @ComposeArgs @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "docker $($ComposeArgs + $Arguments -join ' ') falhou ($LASTEXITCODE)."
    }
}

function Assert-Docker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Docker nao foi encontrado no PATH. Instale ou inicie o Docker Desktop.'
    }
    & docker info --format '{{.ServerVersion}}' *> $null
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker Desktop nao esta respondendo. Inicie-o e tente novamente.'
    }
}

function Test-ComposeDefinition {
    Invoke-Docker config --quiet
    $json = (& docker @ComposeArgs config --format json) | Out-String
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel renderizar o Compose.' }
    $config = $json | ConvertFrom-Json

    $expectedImages = @{
        'evolution-go' = 'evoapicloud/evolution-go:0.7.2'
    }
    foreach ($name in $expectedImages.Keys) {
        if ($config.services.$name.image -ne $expectedImages[$name]) {
            throw "Imagem inesperada em ${name}: $($config.services.$name.image)"
        }
        if (-not $config.services.$name.healthcheck) {
            throw "Healthcheck ausente em ${name}."
        }
    }
    if ($config.services.'evolution-go'.environment.CONNECT_ON_STARTUP -ne 'false') {
        throw 'CONNECT_ON_STARTUP deve permanecer false no ambiente local.'
    }
    if ($config.services.'notify-web'.environment.TEST_MODE -ne '1' -or $config.services.'notify-worker'.environment.TEST_MODE -ne '1') {
        throw 'TEST_MODE deve permanecer 1 no ambiente local.'
    }
    if (-not $config.services.'notify-worker'.healthcheck) {
        throw 'Healthcheck ausente em notify-worker.'
    }
    Write-Host '[ok] Compose valido, versoes fixas e conexao automatica desativada.' -ForegroundColor Green
}

function Get-ServiceState {
    $jsonLines = @(& docker @ComposeArgs ps --all --format json)
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel consultar os containers.' }
    if ($jsonLines.Count -eq 0) { return @() }
    return @($jsonLines | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { $_ | ConvertFrom-Json })
}

function Wait-Healthy {
    $required = @('postgres', 'redis', 'evolution-go', 'notify-web', 'notify-worker')
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $states = Get-ServiceState
        $byService = @{}
        foreach ($state in $states) { $byService[$state.Service] = $state }
        $pending = @($required | Where-Object {
            -not $byService.ContainsKey($_) -or
            $byService[$_].State -ne 'running' -or
            $byService[$_].Health -ne 'healthy'
        })
        if ($pending.Count -eq 0) {
            Write-Host '[ok] Todos os cinco servicos estao healthy.' -ForegroundColor Green
            return
        }
        Write-Host "Aguardando healthchecks: $($pending -join ', ')"
        Start-Sleep -Seconds 5
    } while ((Get-Date) -lt $deadline)

    Invoke-Docker ps --all
    throw "Timeout de ${TimeoutSeconds}s aguardando: $($pending -join ', ')"
}

function Test-HttpEndpoint {
    param([string]$Name, [string]$Uri)
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 8
        if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) {
            throw "HTTP $($response.StatusCode)"
        }
        Write-Host "[ok] ${Name}: $Uri" -ForegroundColor Green
    }
    catch {
        throw "${Name} indisponivel em ${Uri}: $($_.Exception.Message)"
    }
}

function Get-PublishedPort {
    param([string]$Service, [int]$ContainerPort)
    $binding = (& docker @ComposeArgs port $Service $ContainerPort | Select-Object -First 1)
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($binding)) {
        throw "Porta publicada nao encontrada para ${Service}:${ContainerPort}."
    }
    return ($binding -split ':')[-1]
}

function Test-RunningStack {
    Wait-Healthy
    $notifyPort = Get-PublishedPort 'notify-web' 8000
    $goPort = Get-PublishedPort 'evolution-go' 4000
    Test-HttpEndpoint 'notify' "http://127.0.0.1:${notifyPort}/v1/health"
    Test-HttpEndpoint 'Evolution GO' "http://127.0.0.1:${goPort}/server/ok"
}

Assert-Docker
Push-Location $RepoRoot
try {
    switch ($Action) {
        'setup' {
            Test-ComposeDefinition
            Invoke-Docker pull postgres redis evolution-go
            Invoke-Docker build notify-web notify-worker
            Write-Host '[ok] Setup concluido. Execute: .\deploy\local\notify-local.ps1 start' -ForegroundColor Green
        }
        'start' {
            Test-ComposeDefinition
            Invoke-Docker up -d --build --wait --wait-timeout $TimeoutSeconds
            Test-RunningStack
        }
        'diagnose' {
            Invoke-Docker ps --all
            Invoke-Docker logs --tail 80 postgres redis evolution-go notify-web notify-worker
        }
        'verify' {
            Test-ComposeDefinition
            Test-RunningStack
        }
        'stop' {
            Invoke-Docker down
            Write-Host '[ok] Containers removidos; volumes e dados foram preservados.' -ForegroundColor Green
        }
    }
}
finally {
    Pop-Location
}
