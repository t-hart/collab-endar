param (
    [switch]$install
)

# Get the script directory
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path "$SCRIPT_DIR\.."

# Install new web app dependencies if --install is passed as an argument
if ($install) {
    Write-Output "Installing web app dependencies"
    npm install
}

# Build app and serve
npm run build
& "$env:APPDATA\npm\swa" start build --api-location api