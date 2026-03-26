# Velora

Velora is an alternative Zigbee2MQTT web UI that can run inside Home Assistant through add-on ingress.

## Current scope

- Home Assistant add-on ingress is enabled.
- The add-on reuses the standalone Velora runtime image and wraps it with Home Assistant add-on metadata.
- The add-on currently supports `amd64` only.

## Configuration

The add-on accepts the same runtime JSON model as the standalone container, but because Home Assistant add-on options are form-based, the values are entered as JSON strings.

### `connections_json`

Optional explicit frontend connection list.

Example:

```json
[{"id":"main","label":"Main","mode":"proxy","url":"./api/z2m/main/ws"}]
```

### `proxy_targets_json`

Optional list of Zigbee2MQTT proxy targets. When `connections_json` is omitted, Velora derives frontend connections automatically from these targets.

Example:

```json
[{"id":"main","label":"Main","target":"http://zigbee2mqtt:8080"}]
```

This generates the same-origin endpoint relative to the current ingress path:

- `./api/z2m/main/ws` -> `http://zigbee2mqtt:8080/api`

### `api_url_json`

Optional single-connection fallback.

Example:

```json
"ws://zigbee2mqtt:8080/api"
```

## Recommended Home Assistant setup

For Home Assistant OS or Supervised installations, the cleanest approach is:

1. Run Velora as an add-on.
2. Configure one or more proxy targets that point to reachable Zigbee2MQTT instances.
3. Open Velora through Home Assistant ingress.

## Notes

- All JSON options are validated during add-on startup.
- Invalid JSON prevents the add-on from starting.
- This add-on package assumes the standalone image is available at `ghcr.io/codewec/velora:dev` unless `VELORA_IMAGE` is overridden during the add-on build.
