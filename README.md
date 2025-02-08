<div align="center">

# Docker Static Maps API 🗺️

**API for generating static map images**

[![Shield: Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-Support-yellow?logo=buymeacoffee)](https://buymeacoffee.com/mxdcodes) [![Shield: Docker Pulls](https://img.shields.io/docker/pulls/mxdcodes/docker-staticmaps?label=Docker%20Pull)](https://hub.docker.com/r/mxdcodes/docker-staticmaps) [![Build & Publish](https://github.com/dietrichmax/docker-staticmaps/actions/workflows/pipeline.yml/badge.svg)](https://github.com/dietrichmax/docker-staticmaps/actions/workflows/pipeline.yml) [![Shield: License: AGPL v3](https://img.shields.io/github/license/dietrichmax/docker-staticmaps)](https://www.gnu.org/licenses/agpl-3.0).

</div>

**docker-staticmaps** is an open-source API for generating static map images. Easily create maps with markers, polygons, circles, or polylines, making it perfect for embedding map images on websites. Ideal for continuous operation in personal use scenarios.

## 🚀 Features

- ✅ **Generate static maps** with markers, polygons, circles, and polylines.
- 🌍 **Supports multiple basemaps** (OpenStreetMap, Esri, Stamen, Carto).
- ⚡ **Flexible REST API** for easy integration.
- 🐳 **Lightweight containerized solution** for fast deployment.

## 📚 Table of Contents

- [Usage](#usage)
  - [Basemap](#basemap)
  - [Polylines](#polylines)
  - [Polygons](#polygons)
  - [Markers](#markers)
  - [Circles](#circles)
  - [Usage examples](#more-usage-examples)
- [Deployment](#deployment)

## 🧑‍💻 Usage

Request static maps from the `/staticmaps` endpoint using the following parameters:

### Required Parameters

- `center` - Coordinates in the format `lon,lat` (e.g., `-119.49280,37.81084`).
- `zoom` - Zoom level (1 to 18).

### Optional Parameters

- `width` (default: `300`) - Image width in pixels.
- `height` (default: `300`) - Image height in pixels.
- `format` (default: `png`) - Output format (`png`, `jpg`, or `webp`).
- `basemap` (default: `osm`) - Choose a map base layer (see options below).

### 🌍 Basemap

Use predefined basemaps with the `basemap` parameter or specify a `custom` tile server with the `tileUrl` parameter.

Supported basemaps include:

- `osm` - default - [Open Street Map](https://www.openstreetmap.org/)
- `streets` - Esri's [street basemap](https://www.arcgis.com/home/webmap/viewer.html?webmap=7990d7ea55204450b8110d57e20c99ab)
- `satellite` - Esri's [satellite basemap](https://www.arcgis.com/home/webmap/viewer.html?webmap=d802f08316e84c6592ef681c50178f17&center=-71.055499,42.364247&level=15)
- `hybrid` - Satellite basemap with labels
- `topo` - Esri [topographic map](https://www.arcgis.com/home/webmap/viewer.html?webmap=a72b0766aea04b48bf7a0e8c27ccc007)
- `gray` - Esri gray canvas with labels
- `gray-background` - Esri [gray canvas](https://www.arcgis.com/home/webmap/viewer.html?webmap=8b3d38c0819547faa83f7b7aca80bd76) without labels
- `oceans` - Esri [ocean basemap](https://www.arcgis.com/home/webmap/viewer.html?webmap=5ae9e138a17842688b0b79283a4353f6&center=-122.255816,36.573652&level=8)
- `national-geographic` - [National Geographic basemap](https://www.arcgis.com/home/webmap/viewer.html?webmap=d94dcdbe78e141c2b2d3a91d5ca8b9c9)
- `otm` - [OpenTopoMap](https://www.opentopomap.org/)
- `stamen-toner` - [Stamen Toner](http://maps.stamen.com/toner/) black and white map with labels
- `stamen-watercolor` - [Stamen Watercolor](http://maps.stamen.com/watercolor/)
- `carto-light` - [Carto](https://carto.com/location-data-services/basemaps/) Free usage for up to 75,000 mapviews per month, non-commercial services only.
- `carto-dark` - [Carto](https://carto.com/location-data-services/basemaps/) Free usage for up to 75,000 mapviews per month, non-commercial services only.
- `custom` - Use a custom tile URL with parameter `tileurl`

### 🖊️ Polylines

Add a polyline using the `polyline` parameter in the format:

`polyline=polylineStyle|polylineCoord1|polylineCoord2|...`

- `polylineCoord` - Coordinates in `lat,lon` format, separated by `|`. At least two coordinates are required.
- `polylineStyle` - Define `weight` (default `5`), `color` (default `blue`), e.g., `weight:6|color:0000ff`.

**Example**: Polyline with weight `6` and color `0000ff`.

Polyline with no `zoom`, `weight:6` and `color:0000ff`</summary>

```
http://localhost:3000/staticmaps?width=600&height=600&polyline=weight:6|color:0000ff|48.726304979176675,-3.9829935637739382|48.72623035828412,-3.9829726446543385|48.726126671101639,-3.9829546542797467|48.725965124843256,-3.9829070729298808|48.725871429380568,-3.9828726793245273|48.725764250990267,-3.9828064532306628|48.725679557682362,-3.9827385375789146|48.72567025076134,-3.9827310750289113|48.725529844164292,-3.9826617613709225|48.725412537198615,-3.9826296635284164|48.725351694726704,-3.9826201452878531|48.725258599474508,-3.9826063049230411|48.725157520450125,-3.9825900299314232|48.725077863838543,-3.9825779905509102|48.724930435729831,-3.9825514102373938|48.724815578113535,-3.9825237355887291|48.724760905376989,-3.9825013965800564|48.724677938456551,-3.9824534296566916|48.724379435330384,-3.9822469276001118|48.724304509274596,-3.9821850264836076|48.7242453124599,-3.9821320570321772|48.724206187829317,-3.9821063430223207|48.724117073204575,-3.9820862134785551
```

![Polyline Example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/polylinepath.png)

### 🔲 Polygons

Add a polygon using the `polygon` parameter in the format:

`polygon=polygonStyle|polygonCoord1|polygonCoord2|...`

- `polygonCoord` - Coordinates in `lat,lon` format, separated by `|`. First and last coordinates must be the same to close the polygon.
- `polygonStyle` - Define `color` (default `blue`), `weight` (default `5`), and `fill` (default `green`).

**Example**: Polygon with color `4874db`, weight `7`, and fill `eb7a34`.

```
http://localhost:3000/staticmaps?width=600&height=600&polygon=color:4874db|weight:7|fill:eb7a34|41.891169,12.491691|41.890633,12.493697|41.889012,12.492989|41.889467,12.490811|41.891169,12.491691
```

![Polygon Example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/polygonexample.png)

### 📍 Markers

Add one or more markers using the `markers` parameter:

`markers=markerCoord1|markerCoord2|...`

- `markerCoord` - Coordinates in `lat,lon` format, separated by `|`. At least one coordinate is required.

**Example**: Two markers.

```
http://localhost:3000/staticmaps?width=600&height=600&markers=48.726304979176675,-3.9829935637739382|48.724117073204575,-3.9820862134785551
```

![Markers Example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/markers.png)

### ⚪ Circles

Add a circle using the `circle` parameter:

`circle=circleStyle|circleCoord`

- `circleCoord` - Coordinates in `lat,lon` format.
- `circleStyle` - Define `radius` (required), `color` (default `#0000bb`), `width` (default `3`), and `fill` (default `#AA0000`).

**Example**: Circle with a radius of `20` meters.

```
http://localhost:3000/staticmaps?width=600&height=600&basemap=osm&circle=radius:20|color:4874db|fill:0000bb|width:10|48.726304979176675,-3.9829935637739382
```

![Circle Example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/circle.png)

### 🔍 More usage examples

<details>
  <summary>Minimal Example: `center` and `zoom`</summary>
  <p>http://localhost:3000/staticmaps?center=-119.49280,37.81084&zoom=9</p>
</details>

![Minimal Example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/minimalexample.png)

<details>
  <summary>Example with `width=500`, `height=500`, `center=-73.99515,40.76761`, `zoom=10`, `basemap=carto-voyager`</summary>
  <p>http://localhost:3000/staticmaps?width=500&height=500&center=-73.99515,40.76761&zoom=10&format=webp&basemap=carto-voyager</p>
</details>

![Example Request 2](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/example2.webp)

<details>
  <summary>Markers and Polyline Example</summary>
  <p>http://localhost:3000/staticmaps?width=600&height=600&polyline=weight:6|color:0000ff|48.726304979176675,-3.9829935637739382|48.72623035828412,-3.9829726446543385&markers=48.726304979176675,-3.9829935637739382|48.724117073204575,-3.9820862134785551</p>
</details>

![Polyline & Markers](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/markersandpolyline.png)

Also, `POST` requests are supported:

<details>
  <summary>Example with markers, polyline, polygon and circle</summary>
  <p>curl -X POST http://192.168.50.26:3000/staticmaps \
-H "Content-Type: application/json" \
-H "x-api-key: yourSecretApiKeyHere" \
-d '{
   "width":600,
   "height":600,
   "polyline":{
      "weight":6,
      "color":"#0000ff",
      "coords":[
         [
            48.726304979176675,
            -3.9829935637739382
         ],
         [
            48.72623035828412,
            -3.9829726446543385
         ],
         [
            48.726126671101639,
            -3.9829546542797467
         ],
         [
            48.725965124843256,
            -3.9829070729298808
         ],
         [
            48.725871429380568,
            -3.9828726793245273
         ],
         [
            48.725764250990267,
            -3.9828064532306628
         ],
         [
            48.725679557682362,
            -3.9827385375789146
         ],
         [
            48.72567025076134,
            -3.9827310750289113
         ],
         [
            48.725529844164292,
            -3.9826617613709225
         ],
         [
            48.725412537198615,
            -3.9826296635284164
         ],
         [
            48.725351694726704,
            -3.9826201452878531
         ],
         [
            48.725258599474508,
            -3.9826063049230411
         ],
         [
            48.725157520450125,
            -3.9825900299314232
         ],
         [
            48.725077863838543,
            -3.9825779905509102
         ],
         [
            48.724930435729831,
            -3.9825514102373938
         ],
         [
            48.724815578113535,
            -3.9825237355887291
         ],
         [
            48.724760905376989,
            -3.9825013965800564
         ],
         [
            48.724677938456551,
            -3.9824534296566916
         ],
         [
            48.724379435330384,
            -3.9822469276001118
         ],
         [
            48.724304509274596,
            -3.9821850264836076
         ],
         [
            48.7242453124599,
            -3.9821320570321772
         ],
         [
            48.724206187829317,
            -3.9821063430223207
         ],
         [
            48.724117073204575,
            -3.9820862134785551
         ]
      ]
   },
   "markers":{
      "coords":[
         [
            48.726304979176675,
            -3.9829935637739382
         ],
         [
            48.724117073204575,
            -3.9820862134785551
         ]
      ]
   },
   "polygon":{
      "color":"#4874db",
      "width":3,
      "fill":"#0000bb",
      "radius":10,
      "coords":[
         [
            48.724379435330384,
            -3.9822469276001118
         ],
         [
            48.725758,
            -3.983354
         ],
         [
            48.725680,
            -3.984035
         ],
         [
            48.725914,
            -3.984110
         ],
         [
            48.724379435330384,
            -3.9822469276001118
         ]
      ]
   },
   "circle":{
      "color":"#4874db",
      "width":3,
      "fill":"#0000bb",
      "radius":10,
      "coords":[
         [
            48.724379435330384,
            -3.9822469276001118ac
         ]
      ]
   }
}' --output custom_map.png</p>
</details>

![POST request example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/postrequest.png "screenshot of POST request example")

## 🛠️ Deployment

### ⚙️ Supported Environment Variables

| Name | Type | Default Value | Description |
| --- | --- | --- | --- |
| `PORT` | `number` | `3000` | Port number for the API 🖥️ |
| `API_KEY` | `string` |  | Optional API key for authentication 🔑 |
| `ALLOW_API_KEYLESS_ACCESS` | `string` |  | Allow access without an API key (true/false) 🔓 |

### 🐳 Using Docker

To run the container in detached mode:

```bash
docker run -d \
  --name='docker-staticmaps' \
  -p '80:3000/tcp' \
  -e ALLOW_API_KEYLESS_ACCESS=true \
  -e API_KEY="your_api_key" \
  'mxdcodes/docker-staticmaps:latest'
```

Alternatively, use `docker-compose.yml` to set up your environment easily:

```yaml
services:
  docker-staticmaps:
    image: mxdcodes/docker-staticmaps:latest
    container_name: docker-staticmaps
    restart: always
    ports:
      - "3000:3000"
    environment:
      - ALLOW_API_KEYLESS_ACCESS=true
      - API_KEY=your_api_key
```

### 💻 Development

To run the project locally, follow these steps:

1. Clone the repository:

```bash
git clone https://github.com/dietrichmax/docker-staticmaps
```

2. Install the dependencies:

```bash
npm install
```

3. Start the development server:

```
npm start
```

Enjoy building and customizing your static maps! 🌍✨
