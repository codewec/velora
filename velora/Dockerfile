ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.22
ARG VELORA_IMAGE=ghcr.io/codewec/velora:dev

FROM ${VELORA_IMAGE} AS velora
FROM ${BUILD_FROM}

RUN apk add --no-cache caddy jq

COPY --from=velora /srv /srv
COPY --from=velora /usr/local/bin/velora-entrypoint.sh /usr/local/bin/velora-entrypoint.sh
COPY run.sh /run.sh

RUN chmod a+x /run.sh /usr/local/bin/velora-entrypoint.sh

EXPOSE 8080

CMD ["/run.sh"]
