#!/bin/sh
set -eu

RUNTIME_CONFIG_PATH="/srv/runtime-config.js"
CADDYFILE_PATH="/etc/caddy/Caddyfile"

PROXY_TARGETS_JSON="${VELORA_PROXY_TARGETS_JSON:-[]}"
CONNECTIONS_JSON="${VELORA_CONNECTIONS_JSON:-}"
API_URL_JSON="${VELORA_API_URL_JSON:-undefined}"

if [ -z "$CONNECTIONS_JSON" ] && [ "$PROXY_TARGETS_JSON" != "[]" ]; then
  CONNECTIONS_JSON="$(printf '%s' "$PROXY_TARGETS_JSON" | jq -c '[.[] | {
    id: .id,
    label: (.label // .id),
    mode: "proxy",
    url: ("/api/z2m/" + .id + "/ws")
  }]')"
fi

if [ -z "$CONNECTIONS_JSON" ]; then
  CONNECTIONS_JSON="undefined"
fi

cat > "$RUNTIME_CONFIG_PATH" <<EOF
window.__VELORA_CONFIG__ = {
  connections: ${CONNECTIONS_JSON},
  apiUrl: ${API_URL_JSON}
}
EOF

cat > "$CADDYFILE_PATH" <<'EOF'
:8080 {
  root * /srv

  encode zstd gzip

  @runtimeConfig path /runtime-config.js
  header @runtimeConfig Cache-Control "no-store, no-cache, must-revalidate"

  header {
    X-Content-Type-Options nosniff
    Referrer-Policy no-referrer
  }
EOF

if [ "$PROXY_TARGETS_JSON" != "[]" ]; then
  i=0
  printf '%s' "$PROXY_TARGETS_JSON" | jq -cr '.[] | @base64' | while IFS= read -r item; do
    decoded="$(printf '%s' "$item" | base64 -d)"
    id="$(printf '%s' "$decoded" | jq -r '.id')"
    target="$(printf '%s' "$decoded" | jq -r '.target')"
    i=$((i + 1))

    cat >> "$CADDYFILE_PATH" <<EOF

  @z2m_proxy_${i} path /api/z2m/${id}/ws
  handle @z2m_proxy_${i} {
    rewrite * /api
    reverse_proxy ${target}
  }
EOF
  done
fi

cat >> "$CADDYFILE_PATH" <<'EOF'

  try_files {path} /index.html
  file_server
}
EOF

exec caddy run --config "$CADDYFILE_PATH" --adapter caddyfile
