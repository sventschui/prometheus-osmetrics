FROM node:13.13.0

WORKDIR /nodeapp

COPY package.json yarn.lock ./

RUN yarn --frozen-lockfile --production

COPY src ./src/

RUN ls -alh .
