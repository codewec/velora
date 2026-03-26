#!/usr/bin/with-contenv bashio
set -euo pipefail

connections_json="$(bashio::config 'connections_json')"
proxy_targets_json="$(bashio::config 'proxy_targets_json')"
api_url_json="$(bashio::config 'api_url_json')"

validate_json() {
  local value="$1"
  local label="$2"

  if [ -n "$value" ] && ! printf '%s' "$value" | jq -e . >/dev/null 2>&1; then
    bashio::log.fatal "$label must be valid JSON"
    exit 1
  fi
}

# Home Assistant add-on options are stored as strings. We validate them before
# passing the values to the existing Velora runtime so broken JSON fails fast
# during startup instead of surfacing later as a blank page or broken proxy.
validate_json "$connections_json" "connections_json"
validate_json "$proxy_targets_json" "proxy_targets_json"
validate_json "$api_url_json" "api_url_json"

if [ -n "$connections_json" ]; then
  export VELORA_CONNECTIONS_JSON="$connections_json"
fi

if [ -n "$proxy_targets_json" ]; then
  export VELORA_PROXY_TARGETS_JSON="$proxy_targets_json"
fi

if [ -n "$api_url_json" ]; then
  export VELORA_API_URL_JSON="$api_url_json"
fi

bashio::log.info "Starting Velora add-on"
exec /usr/local/bin/velora-entrypoint.sh
