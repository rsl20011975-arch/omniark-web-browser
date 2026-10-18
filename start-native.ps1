$ErrorActionPreference = 'Stop'
$projectDir = $PSScriptRoot
$address = 'http://127.0.0.1:19374'
$env:WORKBENCH_NATIVE = '1'
$env:WORKBENCH_PORT = '19374'
$env:WORKBENCH_DATA = 'data/r2-current'
$env:WORKBENCH_ARTIFACTS = 'artifacts/r2'
$env:CODEX_BIN = (Get-Command codex.exe).Source
$ready = $false
try {
    $response = Invoke-WebRequest -Uri $address -UseBasicParsing -TimeoutSec 2
    $ready = $response.Content.Contains('Local Workbench')
} catch [System.Net.Http.HttpRequestException] { Write-Verbose 'Server is not running' }
  catch [System.Net.WebException] { Write-Verbose 'Server is not running' }
if (-not $ready) {
    $logDir = Join-Path $projectDir 'evidence/r2'
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $serverArgs = @('node_modules/tsx/dist/cli.mjs', 'src/server/index.ts')
    $started = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList $serverArgs -WorkingDirectory $projectDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'native-launch.out.log') -RedirectStandardError (Join-Path $logDir 'native-launch.err.log') -PassThru
    $started.Id | Set-Content -LiteralPath (Join-Path $logDir 'native-launch.pid')
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 500
        try {
            $response = Invoke-WebRequest -Uri $address -UseBasicParsing -TimeoutSec 2
            if ($response.Content.Contains('Local Workbench')) { $ready = $true; break }
        } catch [System.Net.Http.HttpRequestException] { Write-Verbose 'Server starting' }
          catch [System.Net.WebException] { Write-Verbose 'Server starting' }
    }
    if (-not $ready) { throw "Native engine did not start. See $logDir" }
}
$runtime = Join-Path $projectDir 'runtime/chrome-win/chrome.exe'
$profile = Join-Path $projectDir 'profiles/r2'
$extension = Join-Path $projectDir 'native-runtime'
$manifest = Get-Content -LiteralPath (Join-Path $extension 'manifest.json') -Raw | ConvertFrom-Json
$sha = [System.Security.Cryptography.SHA256]::Create()
$digest = $sha.ComputeHash([Convert]::FromBase64String($manifest.key))
$hex = -join ($digest[0..15] | ForEach-Object { $_.ToString('x2') })
$identifier = -join ($hex.ToCharArray() | ForEach-Object { [char](97 + [Convert]::ToInt32([string]$_,16)) })
$argsList = @("--load-extension=`"$extension`"", "--user-data-dir=`"$profile`"", '--no-first-run', "chrome-extension://$identifier/welcome.html")
Start-Process -FilePath $runtime -ArgumentList $argsList
