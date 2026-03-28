$ErrorActionPreference = "Stop"

$extensionRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$packageJsonPath = Join-Path $extensionRoot "package.json"
$codeCli = Join-Path $env:USERPROFILE "AppData\Local\Programs\Microsoft VS Code\bin\code.cmd"

if (-not (Test-Path $packageJsonPath)) {
  throw "Could not find package.json at $packageJsonPath"
}

if (-not (Test-Path $codeCli)) {
  throw "Could not find the VS Code CLI at $codeCli"
}

$package = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

if (-not $package.publisher -or -not $package.name -or -not $package.version) {
  throw "package.json is missing publisher, name, or version."
}

Push-Location $extensionRoot
try {
  Write-Host "Compiling extension..."
  & npm run compile
  if ($LASTEXITCODE -ne 0) {
    throw "Compilation failed."
  }

  $vsixPath = Join-Path $extensionRoot "$($package.name)-$($package.version).vsix"
  if (Test-Path $vsixPath) {
    Remove-Item -LiteralPath $vsixPath -Force
  }

  Write-Host "Packaging VSIX..."
  & npx @vscode/vsce package --allow-missing-repository
  if ($LASTEXITCODE -ne 0) {
    throw "VSIX packaging failed."
  }

  if (-not (Test-Path $vsixPath)) {
    throw "VSIX package was not created at $vsixPath"
  }

  Write-Host "Installing VSIX into VS Code..."
  & $codeCli --install-extension $vsixPath --force
  if ($LASTEXITCODE -ne 0) {
    throw "VS Code extension install failed."
  }

  Write-Host "Installed $($package.publisher).$($package.name) from $vsixPath"
  Write-Host "Reload VS Code to activate the extension."
} finally {
  Pop-Location
}
