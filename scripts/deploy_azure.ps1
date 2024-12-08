if (-not $env:AZURE_STATIC_WEB_APPS_API_TOKEN) {
  Write-Error "AZURE_STATIC_WEB_APPS_API_TOKEN is not set. Please set the environment variable and try again."
  exit 1
}
Write-Output "Running npm build..."
npm run build

if ($LASTEXITCODE -ne 0) {
  Write-Error "Build failed. Please check the build logs for more details."
  exit 1
} else {
  Write-Output "Build succeeded."
}

Write-Output "Deploying to Azure Static Web Apps..."
& "$env:APPDATA\npm\swa" deploy ./build --env production --deployment-token $env:AZURE_STATIC_WEB_APPS_API_TOKEN --api-location api --api-language python --api-version 3.9

if ($LASTEXITCODE -ne 0) {
  Write-Error "Deployment failed. Please check the deployment logs for more details."
  exit 1
} else {
  Write-Output "Deployment succeeded."
}

Read-Host -Prompt "Deployment process complete. Press Enter to exit."