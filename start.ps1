$ErrorActionPreference = 'Stop'
$projectDir = $PSScriptRoot
$address = 'http://127.0.0.1:19371'
$ready = $false
try {
    $response = Invoke-WebRequest -Uri $address -UseBasicParsing -TimeoutSec 2
    $ready = $response.Content.Contains('Local Workbench')
} catch [System.Net.Http.HttpRequestException] {
    $ready = $false
} catch [System.Net.WebException] {
    $ready = $false
}
if (-not $ready) {
    $env:CODEX_BIN = (Get-Command codex.exe).Source
    $logDir = Join-Path $projectDir 'evidence/r1'
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $serverArgs = @('node_modules/tsx/dist/cli.mjs', 'src/server/index.ts')
    $started = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList $serverArgs -WorkingDirectory $projectDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'launcher.out.log') -RedirectStandardError (Join-Path $logDir 'launcher.err.log') -PassThru
    $started.Id | Set-Content -LiteralPath (Join-Path $logDir 'launcher.pid')
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 500
        try {
            $response = Invoke-WebRequest -Uri $address -UseBasicParsing -TimeoutSec 2
            if ($response.Content.Contains('Local Workbench')) { $ready = $true; break }
        } catch [System.Net.Http.HttpRequestException] { Write-Verbose 'Server starting' }
          catch [System.Net.WebException] { Write-Verbose 'Server starting' }
    }
    if (-not $ready) { throw "Workbench server did not start. See $logDir" }
}
$runtime = Join-Path $projectDir 'runtime/chrome-win/chrome.exe'
$profile = Join-Path $projectDir 'profiles/workbench-ui'
Start-Process -FilePath $runtime -ArgumentList @("--app=$address", "--user-data-dir=`"$profile`"", '--no-first-run')
