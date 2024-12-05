#!/bin/bash

npm run build
swa deploy ./build \
  --env production \
  --deployment-token $AZURE_STATIC_WEB_APPS_API_TOKEN \
  --api-location api \
  --api-language python \
  --api-version 3.9
