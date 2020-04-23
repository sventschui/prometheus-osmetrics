FROM node:13.13.0-alpine as build

WORKDIR /nodeapp

COPY package.json yarn.lock ./

ENV NODE_ENV=production

RUN yarn --frozen-lockfile --production --no-bin-links --non-interactive --cache-folder /tmp/ycache

COPY src ./src/

COPY docker-entrypoint.sh /nodeapp

FROM node:13.13.0-alpine

WORKDIR /nodeapp

ENTRYPOINT ["/nodeapp/docker-entrypoint.sh"]

CMD ["start"]

RUN adduser -D -H -s /bin/false prometheus-osmetrics \
  && chown prometheus-osmetrics:prometheus-osmetrics .

USER prometheus-osmetrics

COPY --from=build --chown="prometheus-osmetrics:prometheus-osmetrics" /nodeapp /nodeapp
