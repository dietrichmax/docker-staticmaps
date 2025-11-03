---
title: Installation
description: ""
authors:
  - name: Max Dietrich
  - url: https://mxd.codes
last_update:
  date: 10/07/2025
  author: Max Dietrich
keywords:
  - Installation
slug: /administration-guide/installation
sidebar_position: 1
---

# Installation

The **Docker Static Maps API** can be deployed easily using Docker or Docker Compose.  
It provides a lightweight REST API to render static maps with markers, polygons, circles, polylines, or text.

## Docker Deployment

To run the container in detached mode:

```bash
docker run -d \
  --name='docker-staticmaps' \
  -p '3000:3000' \
  -e API_KEY="your_api_key" \
  -e LOG_LEVEL="INFO" \
  -e TILE_CACHE_TTL=3600 \
  -e DISABLE_TILE_CACHE=false \
  -e MAX_BODY_SIZE=100kb \
  -e RATE_LIMIT_MS=60000 \
  -e RATE_LIMIT_MAX=60 \
  mxdcodes/docker-staticmaps:latest
```

### Docker Compose example

```yml
services:
  docker-staticmaps:
    image: mxdcodes/docker-staticmaps:latest
    container_name: docker-staticmaps
    restart: always
    ports:
      - "3000:3000"
    environment:
      - API_KEY=your_api_key
      - LOG_LEVEL=INFO
      - TILE_CACHE_TTL=3600
      - DISABLE_TILE_CACHE=false
      - MAX_BODY_SIZE=100kb
      - RATE_LIMIT_MS=60000
      - RATE_LIMIT_MAX=60
```

A Healthcheck endpoint is available at:

```
/health
```
