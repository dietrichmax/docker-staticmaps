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

| Parameter | Default | Description |
| --- | --- | --- |
| `center` | (required) | Center of map (`lat,lon`, e.g. `37.81084,-119.49280`). Required if no feature coordinates are provided. |

## Optional Parameters

| Parameter | Default | Description |
| --- | --- | --- |
| `zoom` |  | Zoom level (`1` to `17`). Auto-calculated from features if omitted. |
| `width` | `800` | Width of the output image in pixels. Min: 1, Max: 8192. |
| `height` | `800` | Height of the output image in pixels. Min: 1, Max: 8192. |
| `paddingX` | `0` | Horizontal padding in pixels |
| `paddingY` | `0` | Vertical padding in pixels |
| `format` | `png` | Output format: `png`, `jpg`, `webp` or `pdf` |
| `quality` | `100` | Image quality (0–100) for `jpg`/`webp` |
| `basemap` | `osm` | Tile layer (see **Basemap** for supported types) |
| `attribution` |  | Attribution text (see **Attribution**) |
| `tileUrl` |  | Tile URL with `{x}`, `{y}`, `{z}` or `{quadkey}` placeholders |
| `tileSubdomains` | `[]` | Tile subdomains like `['a', 'b', 'c']` |
| `tileLayers` | `[]` | Multiple tile layers with `tileUrl` and `tileSubdomains` |
| `tileSize` | `256` | Size of tiles in pixels |
| `tileRequestTimeout` |  | Tile request timeout (ms) |
| `tileRequestHeader` | `{}` | Extra headers for tile requests |
| `tileRequestLimit` | `2` | Max parallel tile requests |
| `zoomRange` | `{ min: 1, max: 17 }` | Min and max zoom to try |
| `reverseY` | `false` | Use TMS-style Y axis if `true` |

---
