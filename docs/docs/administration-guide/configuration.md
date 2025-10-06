---
title: Configuration
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
| `RATE_LIMIT_MS` | number | 60000 | Rate limit window in milliseconds |
| `RATE_LIMIT_MAX` | number | 60 | Max requests per IP per window |

---

## API Key Authentication

You can optionally restrict access to the API using an API key.

- **Set an API key** using the `API_KEY` environment variable.
- **If no key is set**, the API runs in keyless mode (anyone can access it).
- **Demo endpoints** (`/demo-map`) are accessible either via a valid `demo_auth=true` cookie **or** a valid API key.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `API_KEY` | string | (none) | Optional key to restrict access to the API |

**Passing the API Key**

You can provide the API key in two ways:

#### 1. Header

```bash
curl -H "x-api-key: your_api_key_here" \
  "http://localhost:3000/api/staticmaps?width=600&height=600&center=40.7128,-74.006&zoom=12"
````

#### 2. Query parameter

```
http://localhost:3000/api/staticmaps?width=600&height=600&center=40.7128,-74.006&zoom=12&API_KEY=your_api_key_here
```

✅ Both methods are supported for **all endpoints**, including demo maps.

---

## Demo Page Access

* Without an API key: Access [http://localhost:3000](http://localhost:3000) directly using a browser cookie `demo_auth=true`.
* With API key: Pass the key using `x-api-key` header or `api_key` query parameter.

Example:

```bash
curl "http://localhost:3000/?api_key=your_api_key_here"
```