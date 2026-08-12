---
title: Configuration
description: ""
authors:
  - name: Max Dietrich
  - url: https://mxd.codes
last_update:
  date: 10/07/2025
  author: Max Dietrich
keywords:
  - Configuration
slug: /administration-guide/configuration
sidebar_position: 2
---

# Configuration

You can configure the **Docker Static Maps API** through environment variables.

## Supported Environment Variables

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `PORT` | number | 3000 | Port number for the API |
| `API_KEY` | string | (none) | Optional key to restrict access |
| `LOG_LEVEL` | string | INFO | Logging level (`DEBUG`, `INFO`, `WARN`, `ERROR`) |
| `TILE_CACHE_TTL` | number | 3600 | Tile cache TTL in seconds |
| `DISABLE_TILE_CACHE` | boolean | false | Set to `true` to disable tile caching |
| `TILE_USER_AGENT` | string | `docker-staticmaps (+<repo URL>)` | `User-Agent` sent when fetching tiles. See [Identifying your deployment to tile servers](#identifying-your-deployment-to-tile-servers). |
| `MAX_BODY_SIZE` | string | 100kb | Controls the maximum request body size |
| `MAX_PARAMETER_LIMIT` | number | 1000 | Controls the maximum number of parameters that are allowed in the URL-encoded data |
| `RATE_LIMIT_MS` | number | 60000 | Rate limit window in milliseconds |
| `RATE_LIMIT_MAX` | number | 60 | Max requests per IP per window |
| `TRUST_PROXY` | string | (none) | Set when running behind a reverse proxy, otherwise rate limiting counts every client as one. See [Running behind a reverse proxy](#running-behind-a-reverse-proxy). |
| `HILLSHADE_TILE_URL` | string | AWS Open Data Terrarium endpoint | Tile URL template for the optional hillshade overlay. Must serve Terrarium-encoded raster-DEM tiles. |
| `HILLSHADE_ATTRIBUTION` | string | `Hillshade: Mapzen / AWS Terrain Tiles` | Short-form attribution appended when `hillshade=true` is set. Override when pointing `HILLSHADE_TILE_URL` at a non-Mapzen DEM source. |
| `ALLOW_PRIVATE_TILE_HOSTS` | string | (none) | Comma-separated hostnames permitted to resolve to private/internal addresses. See [Using a tile server on your own network](#using-a-tile-server-on-your-own-network). |

---

## Identifying your deployment to tile servers

OpenStreetMap's [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) requires clients to identify themselves. Requests without a meaningful `User-Agent` are served an "Access blocked" placeholder image **with HTTP 200 and `Content-Type: image/png`**, so the map renders successfully but every tile reads "App is not following the tile usage policy".

A default `User-Agent` identifying docker-staticmaps is sent automatically. If you run a public or high-traffic instance, set `TILE_USER_AGENT` to something that identifies _your_ deployment and gives operators a way to contact you:

```yaml
environment:
  - TILE_USER_AGENT=my-maps.example.com (admin@example.com)
```

Note that `TILE_USER_AGENT=` with an empty value counts as unset, and the default is used.

---

## Running behind a reverse proxy

If nginx, Traefik or Caddy sits in front of docker-staticmaps, the address the app sees is the proxy's, not the client's. Every request then looks like it comes from the same place, so the per-IP rate limit becomes one bucket shared by everyone and the logs show the proxy on every line.

Set `TRUST_PROXY` to the number of proxies in front of the app:

```yaml
environment:
  - TRUST_PROXY=1
```

Instead of a count you can list the proxies by address or subnet, or use the presets `loopback`, `linklocal` and `uniquelocal`:

```yaml
environment:
  - TRUST_PROXY=loopback,172.18.0.0/16
```

Leave it unset when nothing sits in front of the app.

`TRUST_PROXY=true` is **not** supported and is ignored with a warning. It would trust the `X-Forwarded-For` header from anyone, so a client could send a made-up address and get a fresh rate-limit bucket on every request - use a count or an explicit list instead.

The count has to match what you actually run. With `TRUST_PROXY=2` and one proxy in front, the app reads one step too far down `X-Forwarded-For` and ends up back on a value the client sent.

Check `RATE_LIMIT_MAX` after enabling this. Until now it applied to all clients at once, so if you raised it to stop legitimate traffic being throttled, that figure now applies to each client separately.

---

## Using a tile server on your own network

User-supplied `tileUrl` and marker `img` values are fetched by the server, so requests that reach private or internal addresses are blocked. The check runs at connection time against the resolved IP, so it also covers hostnames that resolve to internal addresses and DNS-rebinding attempts.

**Public tile servers need no configuration.** Every built-in `basemap` (`osm`, `otm`, `satellite`, `carto-light`, …) and any public custom `tileUrl` works out of the box, because those hosts resolve to public addresses.

`ALLOW_PRIVATE_TILE_HOSTS` is **not** a list of permitted tile servers - it is a narrow exemption from the private-address check. Adding a public host such as `tile.openstreetmap.org` does nothing useful and only removes that host's protection, so leave it unset unless you are self-hosting tiles.

You need it only when your tile server is on a LAN or Docker network:

```yaml
services:
  staticmaps:
    image: mxdcodes/docker-staticmaps:latest
    environment:
      - ALLOW_PRIVATE_TILE_HOSTS=tileserver,tiles.homelab.lan
```

```bash
curl "http://localhost:3000/api/staticmaps?width=600&height=400&center=13.4,52.5&zoom=12&tileUrl=http://tileserver:8080/{z}/{x}/{y}.png"
```

Entries match the URL hostname exactly (case-insensitive); there is no wildcard or subdomain matching, and an entry may be a hostname or a literal IP. Only add hosts you control.

Non-HTTP(S) schemes such as `file://` are always rejected, exemption or not.

If you point `HILLSHADE_TILE_URL` at a DEM server on your own network, its hostname needs listing here too.

---

## API Key Authentication

You can optionally restrict access to the API using an API key.

- **Set an API key** using the `API_KEY` environment variable.
- **If no key is set**, the API runs in keyless mode (anyone can access it).
- **Demo endpoints** (`/demo-map`) are accessible either via a valid `demo_auth=true` cookie **or** a valid API key.

| Name      | Type   | Default | Description                                |
| --------- | ------ | ------- | ------------------------------------------ |
| `API_KEY` | string | (none)  | Optional key to restrict access to the API |

**Passing the API Key**

You can provide the API key in two ways:

#### 1. Header

```bash
curl -H "x-api-key: your_api_key_here" \
  "http://localhost:3000/api/staticmaps?width=600&height=600&center=40.7128,-74.006&zoom=12"
```

#### 2. Query parameter

```
http://localhost:3000/api/staticmaps?width=600&height=600&center=40.7128,-74.006&zoom=12&API_KEY=your_api_key_here
```

Both methods are supported for **all endpoints**, including demo maps.

---

## Demo Page Access

- Without an API key: Access [http://localhost:3000](http://localhost:3000) directly using a browser cookie `demo_auth=true`.
- With API key: Pass the key using `x-api-key` header or `api_key` query parameter.

Example:

```bash
curl "http://localhost:3000/?api_key=your_api_key_here"
```
