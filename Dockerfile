FROM node:22-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM caddy:2.10-alpine

WORKDIR /srv

RUN apk add --no-cache jq

COPY --from=build /app/dist /srv
COPY docker/entrypoint.sh /usr/local/bin/velora-entrypoint.sh

RUN chmod +x /usr/local/bin/velora-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/velora-entrypoint.sh"]
