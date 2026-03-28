# Velora

Velora is an alternative Zigbee2MQTT web UI that can run inside Home Assistant through add-on ingress.

## Current scope

- Home Assistant add-on ingress is enabled.
- The add-on reuses the standalone Velora runtime image and wraps it with Home Assistant add-on metadata.
- The add-on currently supports `amd64` and `aarch64`.

## Configuration

The add-on uses native Home Assistant YAML options.

### `z2m_targets`

List of Zigbee2MQTT targets that Velora should expose through the Home Assistant ingress WebSocket proxy.

Single instance example:

```yaml
z2m_targets:
  - id: main
    label: Main
    target: http://zigbee2mqtt:8080
```

Multiple instances example:

```yaml
z2m_targets:
  - id: main
    label: Main
    target: http://zigbee2mqtt-main:8099
  - id: garage
    label: Garage
    target: http://zigbee2mqtt-garage:8099
```

Inside the Home Assistant add-on, each target is converted to a frontend connection URL like:

- `zigbee2mqtt:8080/api`

The browser then reaches it through the Home Assistant ingress WebSocket proxy:

- `./ws-proxy/zigbee2mqtt:8080/api`

## How the Home Assistant transport works

Velora does not talk to Zigbee2MQTT through the browser-facing Home Assistant ingress URL of the Zigbee2MQTT add-on. Instead it uses:

1. the internal Zigbee2MQTT add-on host
2. the Zigbee2MQTT frontend WebSocket endpoint at `/api`
3. the Home Assistant ingress-local `ws-proxy/<host:port/path>` route inside the Velora add-on

In practice the flow is:

1. `z2m_targets` contains a Zigbee2MQTT target such as `http://45df7312-zigbee2mqtt:8099`
2. Velora converts it to the frontend connection `45df7312-zigbee2mqtt:8099/api`
3. the browser opens `./ws-proxy/45df7312-zigbee2mqtt:8099/api`
4. the Velora add-on proxies that WebSocket to `http://45df7312-zigbee2mqtt:8099/api`

## How to derive the Zigbee2MQTT add-on host

If Zigbee2MQTT is opened in Home Assistant at an address like:

```text
http://192.168.1.130:8123/45df7312_zigbee2mqtt
```

then the add-on identifier is:

```text
45df7312_zigbee2mqtt
```

and the internal host typically becomes the same value with underscores replaced by dashes:

```text
45df7312-zigbee2mqtt
```

So the matching Velora target becomes:

```yaml
z2m_targets:
  - id: main
    label: Main
    target: http://45df7312-zigbee2mqtt:8099
```

This is the value that should be placed into `z2m_targets`.

## Troubleshooting

### `bad address`

The internal Zigbee2MQTT host is wrong. Check the add-on identifier and convert underscores to dashes.

Example:

- Home Assistant URL: `http://192.168.1.130:8123/45df7312_zigbee2mqtt`
- internal host: `45df7312-zigbee2mqtt`

### `404` on `/api`

If a plain `wget http://<host>:8099/api` returns `404`, that does not automatically mean the WebSocket endpoint is invalid. Zigbee2MQTT uses `/api` as a WebSocket endpoint, and plain HTTP GET can still return `404`.

### frontend assets blocked due to MIME type

If the browser reports `application/octet-stream` for `runtime-config.js`, CSS, or JS assets, the add-on runtime image is outdated. Update the Velora add-on to the latest image version and restart it.

## Recommended Home Assistant setup

For Home Assistant OS or Supervised installations, the cleanest approach is:

1. Run Velora as an add-on.
2. Configure one or more proxy targets that point to reachable Zigbee2MQTT instances.
3. Open Velora through Home Assistant ingress.

## Notes

- This add-on package assumes the standalone image is available at `ghcr.io/codewec/velora:dev` unless `VELORA_IMAGE` is overridden during the add-on build.
- The device list supports name-based room grouping with the default naming pattern `{room}_{type}_{placement}`.
