---
title: Parameters
description: ""
authors:
  - name: Max Dietrich
  - url: https://mxd.codes
last_update:
  date: 10/07/2025
  author: Max Dietrich
keywords:
  - Parameters
slug: /api-reference/parameters
sidebar_position: 1
---

# Parameters

Request static maps from the `/api/staticmaps` endpoint using the following parameters:

## Required Parameters

You must supply either `center` or at least one feature with coordinates (`markers`, `polyline`, `polygon`, `circle`, `text`); a request with neither is rejected with HTTP 422.

| Parameter | Default | Description |
| --- | --- | --- |
| `center` | (required unless a feature supplies coordinates) | Center of map (`lon,lat`, e.g. `-119.49280,37.81084`) |

## Optional Parameters

| Parameter | Default | Description |
| --- | --- | --- |
| `zoom` | (fitted to content) | Zoom level (`1` to `20`). Omit to fit the map to its features using `zoomRange`. |
| `width` | `800` | Width of the output image in pixels. Min: 1, Max: 8192. |
| `height` | `800` | Height of the output image in pixels. Min: 1, Max: 8192. |
| `paddingX` | `0` | Horizontal padding in pixels |
| `paddingY` | `0` | Vertical padding in pixels |
| `format` | `png` | Output format: `png`, `jpg`, `jpeg`, `webp` or `pdf` |
| `quality` | `100` | Image quality (0–100) for `jpg`/`webp` |
| `basemap` | `osm` | Tile layer (see **Basemap** for supported types) |
| `attribution` |  | Attribution text (see **Attribution**) |
| `tileUrl` |  | Tile URL with `{x}`, `{y}`, `{z}` or `{quadkey}` placeholders. Rejected if the host resolves to a private or internal address (see **Configuration**). |
| `tileSubdomains` | `[]` | Tile subdomains like `['a', 'b', 'c']`. Max 10; entries must match `[a-zA-Z0-9-]+`. |
| `tileLayers` | `[]` | Multiple tile layers with `tileUrl` and `tileSubdomains`. Max 10 layers. |
| `tileSize` | `256` | Size of tiles in pixels. Must match what your tile server serves, usually 256 or 512. Clamped to 64–1024. |
| `tileRequestTimeout` |  | Tile request timeout (ms). Capped at 30000. |
| `tileRequestHeader` | `{}` | Extra headers for tile requests. Only `User-Agent`, `Accept`, `Accept-Language`, `Referer` and `Cache-Control` are forwarded; all others are dropped. |
| `tileRequestLimit` | `2` | Max parallel tile requests. Clamped to 1–8. |
| `zoomRange` | `{ min: 1, max: 17 }` | Min and max zoom to try |
| `reverseY` | `false` | Use TMS-style Y axis if `true` |
| `hillshade` | `false` | Composite a shaded-relief overlay on top of the basemap (see **Hillshade**) |

---

## Limits

Requests exceeding these are rejected rather than silently truncated:

| Limit | Value |
| --- | --- |
| Image dimensions | 8192 x 8192, and at most 25,000,000 pixels total |
| Features per request | 1000 across `markers`, `polyline`, `polygon`, `circle` and `text` combined |
| Zoom | 20 |
| Tiles per layer | 1024. Raise `tileSize` or reduce `width`/`height` if a request exceeds it. |

A map covering the full 25,000,000 pixel budget needs 441 tiles at the default `tileSize`, so the tile limit is only reachable by setting a much smaller `tileSize`. `hillshade=true` adds a second layer, each counted separately.

---
