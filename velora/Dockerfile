ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.22
ARG VELORA_IMAGE=ghcr.io/codewec/velora:dev

FROM ${VELORA_IMAGE} AS velora
FROM ${BUILD_FROM}

RUN apk add --no-cache jq nginx

COPY --from=velora /srv /srv
COPY run.sh /run.sh

RUN chmod a+x /run.sh

EXPOSE 8080

CMD ["/run.sh"]
