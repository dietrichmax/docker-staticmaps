#### Base Image
FROM node:20 AS base

# Copyright © 2024 Max Dietrich <mail@mxd.codes>. All rights reserved.

# Add Open Container Initiative (OCI) annotations.
# See: https://github.com/opencontainers/image-spec/blob/main/annotations.md
LABEL org.opencontainers.image.title "docker-staticmaps"
LABEL org.opencontainers.image.description "A containerized web version for staticmaps with Express"
LABEL org.opencontainers.image.url "https://hub.docker.com/repository/docker/mxdcodes/docker-staticmaps"
LABEL org.opencontainers.image.source "https://github.com/dietrichmax/docker-staticmaps"
LABEL org.opencontainers.image.documentation "https://github.com/dietrichmax/docker-staticmaps/blob/main/README.md"
LABEL org.opencontainers.image.authors "Max Dietrich <mail@mxd.codes>"
LABEL org.opencontainers.image.vendor "Max Dietrich"


RUN mkdir -p /opt/app

WORKDIR /opt/app

COPY package.json .

# install dependencies
RUN npm install

COPY . .

EXPOSE 3000

CMD [ "npm", "run", "start"]