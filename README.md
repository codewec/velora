# z2m-ui

Alternative Zigbee2MQTT web UI built with `Vue 3`, `Vite`, `Pinia`, and `@nuxt/ui`.

## Runtime model

- Frontend supports multiple Zigbee2MQTT connections.
- Each connection has its own `id`, `label`, `mode` and `url`.
- Development against Home Assistant ingress uses local paths like `/z2m-ws/<connection-id>`, and Vite proxies them to the corresponding HA ingress endpoint while adding `ingress_session` cookie.
- Docker/self-hosted production can use direct or app-owned proxy URLs per connection.
- The frontend talks to Zigbee2MQTT over WebSocket and expects messages in `{ topic, payload }` form.

## Setup

```sh
pnpm install
cp .env.example .env
```

Set transport variables in `.env`.

Example for current development:

```env
VITE_Z2M_CONNECTIONS=[{"id":"ha-main","label":"HA Main","mode":"ha-ingress","url":"/z2m-ws/ha-main"},{"id":"garage","label":"Garage","mode":"proxy","url":"/z2m-ws/garage"}]
Z2M_PROXY_CONNECTIONS=[{"id":"ha-main","target":"http://192.168.1.130:8123/api/hassio_ingress/<temporary-token>","cookie":"<ingress_session-cookie>"},{"id":"garage","target":"http://192.168.1.131:8123/api/hassio_ingress/<temporary-token>","cookie":"<ingress_session-cookie>"}]
```

## Commands

```sh
pnpm dev
pnpm type-check
pnpm build
pnpm lint
```
