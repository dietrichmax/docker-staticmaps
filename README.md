<div align="center">

# Docker Static Maps API 🗺️

**Generate static map images via a lightweight REST API**

[![Shield: Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-Support-yellow?logo=buymeacoffee)](https://buymeacoffee.com/mxdcodes) ![Version](https://img.shields.io/github/v/release/dietrichmax/docker-staticmaps) [![Shield: Docker Pulls](https://img.shields.io/docker/pulls/mxdcodes/docker-staticmaps?label=Docker%20Pull)](https://hub.docker.com/r/mxdcodes/docker-staticmaps) ![Shield: Docker Image Size](https://img.shields.io/docker/image-size/mxdcodes/docker-staticmaps/latest?label=Image%20Size) [![Build](https://github.com/dietrichmax/docker-staticmaps/actions/workflows/docker-build.yml/badge.svg)](https://github.com/dietrichmax/docker-staticmaps/actions/workflows/docker-build.yml) [![Deploy Docs](https://github.com/dietrichmax/docker-staticmaps/actions/workflows/deploy-docs.yml/badge.svg)](https://github.com/dietrichmax/docker-staticmaps/actions/workflows/deploy-docs.yml)

</div>

**docker-staticmaps** is an open-source API for rendering static map images. Easily create maps with markers, polygons, circles, polylines or text, making it perfect for embedding map images on websites or apps. Comes with built-in rate limiting and image caching to optimize performance and protect against abuse.

## 🚀 Features

- ✅ **Generate static maps** with markers, polygons, circles, polylines and text.
- 🌍 **Supports multiple basemaps** (OpenStreetMap, Esri, Stamen, Carto, custom tile server).
- ⚡ **Easy-to-use REST API** - simple integration with any frontend or backend.
- 🐳 **Docker-ready** for fast, lightweight deployment.
- 🧊 **Tile and image caching** for performance.
- 🚦 **Built-in rate limiting** per IP to protect against abuse.

## 🏁 Quickstart

Run the service with Docker:

```bash
docker run -p '3000:3000/tcp' mxdcodes/docker-staticmaps:latest
```

Send a sample request:

```bash
curl "http://localhost:3000/api/staticmaps?width=1000&height=1000&center=-18.2871,147.6992&zoom=9&basemap=satellite"
```

![Minimal Example](https://dietrichmax.github.io/docker-staticmaps/assets/images/minimalexample-6cc6df614926b577bae521db1a31410a.png)

A interactive playground is available at [http://localhost:3000](http://localhost:3000 "docker-staticmaps interactive playground")

![Interactive playground](https://dietrichmax.github.io/docker-staticmaps/assets/images/docker-staticmaps-playground-screenshot-91d4739dfbc7eb705bd4ae4152982a0e.png)

## Documentation

The documentation of the latest development version is in the `docs/` subdirectory. A HTML version can be found at https://dietrichmax.github.io/docker-staticmaps/.

## License

Copyright (C) 2026 Max Dietrich

The source code of this project is licensed under the GNU Affero General Public License version 3 or later (AGPL-3.0+).  

Portions of this project (in the `staticmaps` folder) were originally based on [staticmaps](https://github.com/StephanGeorg/staticmaps) (MIT License).

## Contributing

Contributions, bug reports and pull requests are welcome.
