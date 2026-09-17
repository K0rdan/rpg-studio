#!/usr/bin/env bash
set -euo pipefail

: "${AZURITE_CONNECTION_STRING:?AZURITE_CONNECTION_STRING is required}"
CONTAINER="${AZURE_STORAGE_TILESETS_CONTAINER:-tilesets}"

# Collapse YAML-folded newlines/spaces so Azure CLI accepts the string.
CONN="${AZURITE_CONNECTION_STRING//[$'\n\r ']/}"

echo "Creating Azurite container '${CONTAINER}' if it does not exist..."
# No --fail-on-exist: the flag takes no value and `create` is already idempotent.
az storage container create \
  --name "${CONTAINER}" \
  --connection-string "${CONN}" \
  --output none

echo "Configuring permissive CORS for local browser access..."
az storage cors clear \
  --services b \
  --connection-string "${CONN}" \
  --output none || true

az storage cors add \
  --services b \
  --methods GET HEAD PUT POST DELETE OPTIONS \
  --origins '*' \
  --allowed-headers '*' \
  --exposed-headers '*' \
  --max-age 3600 \
  --connection-string "${CONN}" \
  --output none || true

echo "Azurite init complete."
