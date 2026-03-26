#!/usr/bin/with-contenv bashio
set -euo pipefail

runtime_config_path="/srv/runtime-config.js"
nginx_config_path="/tmp/nginx.conf"

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

if [ -z "$connections_json" ] && [ -n "$proxy_targets_json" ] && [ "$proxy_targets_json" != "[]" ]; then
  # In Home Assistant we reuse the ingress `ws-proxy/<host:port/path>` contract
  # used by Windfront. Targets therefore become frontend URLs like
  # `45df7312-zigbee2mqtt:8099/api` instead of local `/api/z2m/...` routes.
  connections_json="$(printf '%s' "$proxy_targets_json" | jq -c '[.[] | {
    id: .id,
    label: (.label // .id),
    mode: "proxy",
    url: (
      (.target | sub("^https?://"; "") | sub("/+$"; ""))
      + (if (.target | test("/api/?$")) then "" else "/api" end)
    )
  }]')"
fi

if [ -n "$connections_json" ]; then
  runtime_connections_json="$connections_json"
else
  runtime_connections_json="undefined"
fi

if [ -n "$api_url_json" ]; then
  runtime_api_url_json="$api_url_json"
else
  runtime_api_url_json="undefined"
fi

echo "[velora] runtime proxy targets: ${proxy_targets_json}"
echo "[velora] runtime frontend connections: ${runtime_connections_json}"
echo "[velora] runtime apiUrl fallback: ${runtime_api_url_json}"

cat > "$runtime_config_path" <<EOF
window.__VELORA_CONFIG__ = {
  connections: ${runtime_connections_json},
  apiUrl: ${runtime_api_url_json}
}
EOF

cat > "$nginx_config_path" <<'EOF'
daemon off;
user nginx;
pid /var/run/nginx.pid;
worker_processes 1;

events {
    worker_connections 512;
}

http {
    access_log              off;
    client_max_body_size    4G;
    include                 /etc/nginx/mime.types;
    default_type            application/octet-stream;
    keepalive_timeout       65;
    sendfile                off;
    server_tokens           off;
    tcp_nodelay             on;
    tcp_nopush              on;

    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    resolver 127.0.0.11 ipv6=off;

    server {
        listen 8080 default_server;
        root /srv;
        server_name _;

        location = /runtime-config.js {
            add_header Cache-Control "no-store, no-cache, must-revalidate";
            try_files $uri =404;
        }

        location /ws-proxy/ {
            set $target_hostpath '';
            set $target_host '';

            if ($uri ~ ^/ws-proxy/(.+)$) {
                set $target_hostpath $1;
            }

            if ($target_hostpath ~ ^([^/]+)) {
                set $target_host $1;
            }

            proxy_pass                  http://$target_hostpath$is_args$args;
            proxy_http_version          1.1;
            proxy_ignore_client_abort   off;
            proxy_read_timeout          86400s;
            proxy_redirect              off;
            proxy_send_timeout          86400s;
            proxy_max_temp_file_size    0;

            proxy_no_cache     1;
            proxy_cache_bypass 1;

            add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
            add_header Pragma "no-cache";
            add_header Expires 0;

            proxy_set_header Accept-Encoding "";
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $target_host;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-NginX-Proxy true;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
EOF

nginx -t -c "$nginx_config_path"
bashio::log.info "Starting Velora add-on"
exec nginx -c "$nginx_config_path"
