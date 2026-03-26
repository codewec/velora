# Velora

Alternative Zigbee2MQTT web UI built with `Vue 3`, `Vite`, `Pinia`, and `@nuxt/ui`.

## Runtime model

- The frontend supports multiple Zigbee2MQTT connections.
- Each connection has its own `id`, `label`, `mode`, and `url`.
- Development against Home Assistant ingress uses local paths like `/z2m-ws/<connection-id>`, and Vite proxies them to the corresponding HA ingress endpoint while adding the `ingress_session` cookie.
- Standalone production uses a static SPA served by Caddy.
- Production runtime config is injected by the container into `/runtime-config.js`, so the same image can be reused with different connection lists without rebuilding.
- The standalone container can also generate same-origin WebSocket proxy routes like `/api/z2m/<id>/ws` from runtime JSON configuration.

## Development

```sh
pnpm install
cp .env.example .env
pnpm dev
```

Example development config:

```env
VITE_Z2M_CONNECTIONS=[{"id":"ha-main","label":"HA Main","mode":"ha-ingress","url":"/z2m-ws/ha-main"},{"id":"garage","label":"Garage","mode":"proxy","url":"/z2m-ws/garage"}]
Z2M_PROXY_CONNECTIONS=[{"id":"ha-main","target":"http://192.168.1.130:8123/api/hassio_ingress/<temporary-token>","cookie":"<ingress_session-cookie>"},{"id":"garage","target":"http://192.168.1.131:8123/api/hassio_ingress/<temporary-token>","cookie":"<ingress_session-cookie>"}]
```

## Standalone Docker

Build the image:

```sh
docker build -t velora .
```

Run it with runtime-configured connections:

```sh
docker run --rm -p 8080:8080 \
  -e 'VELORA_CONNECTIONS_JSON=[{"id":"main","label":"Main","mode":"proxy","url":"/api/z2m/main/ws"}]' \
  -e 'VELORA_PROXY_TARGETS_JSON=[{"id":"main","label":"Main","target":"http://zigbee2mqtt:8080"}]' \
  velora
```

You can also use the example compose file:

```sh
docker compose -f docker-compose.example.yml up --build
```

### Runtime environment variables

- `VELORA_CONNECTIONS_JSON`
  Runtime JSON array of connection objects:

  ```json
  [
    {
      "id": "main",
      "label": "Main",
      "mode": "proxy",
      "url": "/api/z2m/main/ws"
    }
  ]
  ```

- `VELORA_API_URL_JSON`
  Optional single-connection fallback. Example:

  ```sh
  -e 'VELORA_API_URL_JSON="ws://192.168.1.130:8080/api"'
  ```

- `VELORA_PROXY_TARGETS_JSON`
  Runtime JSON array used to generate same-origin Caddy reverse proxy routes:

  ```json
  [
    {
      "id": "main",
      "label": "Main",
      "target": "http://zigbee2mqtt:8080"
    },
    {
      "id": "garage",
      "label": "Garage",
      "target": "http://zigbee2mqtt-garage:8080"
    }
  ]
  ```

  This generates:

  - `/api/z2m/main/ws` -> `http://zigbee2mqtt:8080/api`
  - `/api/z2m/garage/ws` -> `http://zigbee2mqtt-garage:8080/api`

### Automatic proxy mode

If `VELORA_CONNECTIONS_JSON` is omitted and `VELORA_PROXY_TARGETS_JSON` is provided, the container derives frontend connections automatically:

```json
[
  {
    "id": "main",
    "label": "Main",
    "mode": "proxy",
    "url": "/api/z2m/main/ws"
  }
]
```

You can still bypass the built-in proxy and use direct Zigbee2MQTT URLs if preferred.

## Commands

```sh
pnpm dev
pnpm type-check
pnpm build
pnpm lint
```

## GitHub Actions

Two workflows are included:

- `CI`
  - installs dependencies
  - runs `pnpm type-check`
  - runs `pnpm build`

- `Docker`
  - builds the production image on pushes, PRs, and manual runs
  - pushes to `ghcr.io/<owner>/<repo>` on non-PR runs

## Home Assistant add-on: what is still needed

Standalone Docker is now covered by:

- runtime-configurable SPA image
- Caddy static serving
- generated same-origin proxy routes for multiple Zigbee2MQTT instances
- GitHub Actions for CI and Docker builds

Home Assistant add-on packaging is now included in `velora/`:

- `repository.yaml`
- `velora/config.yaml`
- `velora/build.yaml`
- `velora/Dockerfile`
- `velora/run.sh`
- `velora/DOCS.md`

### Add-on build model

The add-on does not rebuild the frontend from source. Instead it wraps the published standalone runtime image:

- default standalone image: `ghcr.io/codewec/velora:dev`
- add-on base image: `ghcr.io/home-assistant/amd64-base:3.22`

That keeps the add-on packaging small and lets the standalone pipeline remain the source of truth for the runtime image.

### Add-on configuration

The add-on uses the same runtime JSON contract as the standalone container, exposed as Home Assistant add-on string options:

- `connections_json`
- `proxy_targets_json`
- `api_url_json`

The recommended add-on setup is to provide `proxy_targets_json` and let Velora derive same-origin frontend connections automatically.

### What is still missing for a polished add-on release

- add-on icon/logo assets
- release process that updates the add-on image reference from `:dev` to a versioned image tag
- optional add-on specific GitHub Actions build/publish workflow
- real-world validation inside Home Assistant OS / ingress
