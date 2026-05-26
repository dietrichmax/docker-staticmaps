<div align="center">

# Docker Static Maps API 🗺️

**Generate static map images via a REST API**

![Version](https://img.shields.io/github/v/release/dietrichmax/docker-staticmaps) [![Shield: Docker Pulls](https://img.shields.io/docker/pulls/mxdcodes/docker-staticmaps?label=Docker%20Pull)](https://hub.docker.com/r/mxdcodes/docker-staticmaps) ![Shield: Docker Image Size](https://img.shields.io/docker/image-size/mxdcodes/docker-staticmaps/latest?label=Image%20Size)

</div>

Self-hostable REST API for rendering static map images with markers, polygons, circles, polylines and text overlays. Includes tile caching, per-IP rate limiting and optional API key auth.

Documentation: https://dietrichmax.github.io/docker-staticmaps/

## Features

- Markers, polygons, circles, polylines and text overlays
- Multiple basemaps (OpenStreetMap, Esri, Carto) and custom tile servers
- Optional hillshade overlay (Terrarium-encoded raster-DEM tiles)
- Tile and image caching
- Per-IP rate limiting
- Optional API key authentication

## Quickstart

Run with Docker:

```bash
docker run -p '3000:3000/tcp' mxdcodes/docker-staticmaps:latest
```

Sample request:

```bash
curl "http://localhost:3000/api/staticmaps?width=1000&height=1000&center=-18.2871,147.6992&zoom=9&basemap=satellite"
```

![Minimal Example](https://dietrichmax.github.io/docker-staticmaps/assets/images/minimalexample-6cc6df614926b577bae521db1a31410a.png)

An interactive playground is available at [http://localhost:3000](http://localhost:3000).

![Interactive playground](https://dietrichmax.github.io/docker-staticmaps/assets/images/docker-staticmaps-playground-screenshot-91d4739dfbc7eb705bd4ae4152982a0e.png)

## License

Copyright (C) 2026 Max Dietrich

The source code of this project is licensed under the GNU Affero General Public License version 3 or later (AGPL-3.0+).

Portions of this project (in the `staticmaps` folder) were originally based on [staticmaps](https://github.com/StephanGeorg/staticmaps) (MIT License).

## Contributing

Contributions, bug reports and pull requests are welcome.
