<div align="center">

# Docker Static Maps API 🗺️

**API for generating static map images**

[![Shield: Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-Support-yellow?logo=buymeacoffee)](https://buymeacoffee.com/mxdcodes) ![Version](https://img.shields.io/github/v/release/dietrichmax/docker-staticmaps) [![Shield: Docker Pulls](https://img.shields.io/docker/pulls/mxdcodes/docker-staticmaps?label=Docker%20Pull)](https://hub.docker.com/r/mxdcodes/docker-staticmaps) [![Build](https://github.com/dietrichmax/docker-staticmaps/actions/workflows/docker-build.yml/badge.svg)](https://github.com/dietrichmax/docker-staticmaps/actions/workflows/docker-build.yml) [![Shield: License: AGPL v3](https://img.shields.io/github/license/dietrichmax/docker-staticmaps)](https://www.gnu.org/licenses/agpl-3.0)

</div>

**docker-staticmaps** is an open-source API for generating static map images. Easily create maps with markers, polygons, circles, polylines or text, making it perfect for embedding map images on websites. Ideal for continuous operation in personal use scenarios.

## 🚀 Features

- ✅ **Generate static maps** with markers, polygons, circles, polylines and text.
- 🌍 **Supports multiple basemaps** (OpenStreetMap, Esri, Stamen, Carto).
- ⚡ **Flexible REST API** for easy integration.
- 🐳 **Lightweight containerized solution** for fast deployment.

## Quickstart

With Docker:

```bash
docker run -p '3000:3000/tcp' -e ALLOW_API_KEYLESS_ACCESS=true mxdcodes/docker-staticmaps:latest
```

Example API Request:

```bash
curl "http://localhost:3000/api/staticmaps?center=-119.49280,37.81084&zoom=9"
```

![Minimal Example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/minimalexample.png)

## 📚 Table of Contents

- [Installation & Configuration](#️-installation--configuration)
  - [Supported Environment Variables](#️-supported-environment-variables)
  - [Deployment using Docker](#-deployment-using-docker)
- [API Reference](#-api-reference)
  - [Basemap](#-basemap)
  - [Polylines](#️-polylines)
  - [Polygons](#-polygons)
  - [Markers](#-markers)
  - [Circles](#-circles)
  - [Text](#-text)
  - [More usage examples](#-more-usage-examples)
- [Development](#-development)

## 🛠️ Installation & Configuration

### ⚙️ Supported Environment Variables

| Name | Type | Default Value | Description |
| --- | --- | --- | --- |
| `PORT` | `number` | `3000` | Port number for the API 🖥️ |
| `API_KEY` | `string` |  | Optional API key for authentication 🔑 |
| `ALLOW_API_KEYLESS_ACCESS` | `string` | `false` | Allow access without an API key (true/false) 🔓 |
| `LOG_LEVEL` | `string` | `INFO` | Level of logging detail, e.g. `DEBUG`, `INFO`, `WARN` or `ERROR` 🔥 |

### 🐳 Deployment using Docker

To run the container in detached mode:

```bash
docker run -d \
  --name='docker-staticmaps' \
  -p '3000:3000/tcp' \
  -e ALLOW_API_KEYLESS_ACCESS=true \
  -e API_KEY="your_api_key" \
  -e LOG_LEVEL="INFO" \
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
      - LOG_LEVEL="INFO"
```

## 🧑‍💻 API Reference

Request static maps from the `/staticmaps` endpoint using the following parameters:

### Required Parameters

| Parameter | Default | Description |
| --- | --- | --- |
| `center` | (required) | Coordinates in the format `lon,lat` (e.g., `-119.49280,37.81084`). |
| `zoom` | (required) | Zoom level (1 to 18). |

### Optional Parameters

| Parameter | Default | Description                                    |
| --------- | ------- | ---------------------------------------------- |
| `width`   | `300`   | Image width in pixels.                         |
| `height`  | `300`   | Image height in pixels.                        |
| `format`  | `png`   | Output format (`png`, `jpg`, or `webp`).       |
| `basemap` | `osm`   | Choose a map base layer (see basemap options). |

---

### 🌍 Basemap

Use predefined basemaps with the `basemap` parameter or specify a `custom` tile server with the `tileUrl` parameter.

Supported basemaps include:

- `osm` - default - [Open Street Map](https://www.openstreetmap.org/)
- `otm` - [OpenTopoMap](https://www.opentopomap.org/)
- `streets` - Esri's [street basemap](https://www.arcgis.com/home/webmap/viewer.html?webmap=7990d7ea55204450b8110d57e20c99ab)
- `satellite` - Esri's [satellite basemap](https://www.arcgis.com/home/webmap/viewer.html?webmap=d802f08316e84c6592ef681c50178f17&center=-71.055499,42.364247&level=15)
- `hybrid` - Satellite basemap with labels
- `topo` - Esri [topographic map](https://www.arcgis.com/home/webmap/viewer.html?webmap=a72b0766aea04b48bf7a0e8c27ccc007)
- `gray` - Esri gray canvas with labels
- `gray-background` - Esri [gray canvas](https://www.arcgis.com/home/webmap/viewer.html?webmap=8b3d38c0819547faa83f7b7aca80bd76) without labels
- `oceans` - Esri [ocean basemap](https://www.arcgis.com/home/webmap/viewer.html?webmap=5ae9e138a17842688b0b79283a4353f6&center=-122.255816,36.573652&level=8)
- `national-geographic` - [National Geographic basemap](https://www.arcgis.com/home/webmap/viewer.html?webmap=d94dcdbe78e141c2b2d3a91d5ca8b9c9)
- `stamen-toner` - [Stamen Toner](http://maps.stamen.com/toner/) black and white map with labels
- `stamen-watercolor` - [Stamen Watercolor](http://maps.stamen.com/watercolor/)
- `carto-light` - [Carto](https://carto.com/location-data-services/basemaps/) Free usage for up to 75,000 mapviews per month, non-commercial services only.
- `carto-dark` - [Carto](https://carto.com/location-data-services/basemaps/) Free usage for up to 75,000 mapviews per month, non-commercial services only.
- `custom` - Use a custom tile URL with parameter `tileurl`

---

### 🖊️ Polylines

To add a polyline, use the `polyline` parameter in this format:

```
polyline=polylineStyle|polylineCoord1|polylineCoord2|...
```

- **polylineCoord**: Coordinates in `lat, lon` format, separated by `|`. You need at least two coordinates.
- **polylineStyle**: Customize the polyline with:

  | Parameter | Default   | Description                               |
  | --------- | --------- | ----------------------------------------- |
  | `weight`  | `6`       | Sets the stroke width of the polyline.    |
  | `color`   | `#0000ff` | Defines the stroke color of the polyline. |

Note: Polylines with only two coordinates are rendered as geodesic line.

**Example**: Polyline with no `zoom`, `weight:6` and `color:0000ff`.

```
http://localhost:3000/api/staticmaps?width=600&height=600&polyline=weight:6|color:0000ff|48.726304979176675,-3.9829935637739382|48.72623035828412,-3.9829726446543385|48.726126671101639,-3.9829546542797467|48.725965124843256,-3.9829070729298808|48.725871429380568,-3.9828726793245273|48.725764250990267,-3.9828064532306628|48.725679557682362,-3.9827385375789146|48.72567025076134,-3.9827310750289113|48.725529844164292,-3.9826617613709225|48.725412537198615,-3.9826296635284164|48.725351694726704,-3.9826201452878531|48.725258599474508,-3.9826063049230411|48.725157520450125,-3.9825900299314232|48.725077863838543,-3.9825779905509102|48.724930435729831,-3.9825514102373938|48.724815578113535,-3.9825237355887291|48.724760905376989,-3.9825013965800564|48.724677938456551,-3.9824534296566916|48.724379435330384,-3.9822469276001118|48.724304509274596,-3.9821850264836076|48.7242453124599,-3.9821320570321772|48.724206187829317,-3.9821063430223207|48.724117073204575,-3.9820862134785551
```

![Polyline Example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/polylinepath.png)

---

### 🔲 Polygons

To add a polygon, use the `polygon` parameter in this format:

```
polygon=polygonStyle|polygonCoord1|polygonCoord2|...
```

- **polygonCoord**: List of coordinates in `lat, lon` format, separated by `|`. The first and last coordinates should be the same to close the polygon.
- **polygonStyle**: Customize the polygon with:

  | Parameter | Default   | Description                              |
  | --------- | --------- | ---------------------------------------- |
  | `color`   | `#4874db` | Defines the stroke color of the polygon. |
  | `weight`  | `5`       | Sets the stroke width of the polygon.    |
  | `fill`    | `#00ff3f` | Specifies the fill color of the polygon. |

<details>
  <summary><b>Example:</b> Polygon with color <code>4874db</code>, weight <code>7</code>, and fill <code>eb7a34</code></summary>
   <p><code>http://localhost:3000/api/staticmaps?width=800&height=800&polygon=color:332fd0|weight:3|fill:00FF003F|54.82446670532232,9.421944618225211|54.81986236572277,9.426388740539608|54.818473815918026,9.426388740539608|54.8165283203125,9.428054809570256|54.814861297607365,9.428054809570256|54.812637329101676,9.431389808654785|54.81124877929693,9.43194580078125|54.81069564819336,9.435277938842773|54.80847167968744,9.43972206115734|54.80736160278332,9.43972206115734|54.806526184082145,9.43861007690441|54.8051376342774,9.435277938842773|54.803470611572266,9.435277938842773|54.802917480468864,9.43194580078125|54.800971984863395,9.429166793823185|54.79875183105469,9.429720878601074|54.79375076293945,9.434721946716252|54.7926406860351,9.434721946716252|54.791805267333984,9.433055877685604|54.791526794433594,9.43416786193859|54.78985977172863,9.43416786193859|54.788471221923885,9.435277938842773|54.788749694824276,9.436389923095703|54.79013824462902,9.435833930969238|54.79041671752941,9.436944007873592|54.79569625854498,9.436945915222168|54.79680633544933,9.435833930969238|54.79902648925787,9.435833930969238|54.79930496215826,9.436944007873592|54.80152893066412,9.436944007873592|54.803195953369254,9.438055992126522|54.80458450317383,9.43972206115734|54.80764007568365,9.453055381774902|54.81013870239258,9.454723358154297|54.81124877929693,9.454723358154297|54.81124877929693,9.453055381774902|54.812362670898494,9.453055381774902|54.81402587890625,9.455277442932186|54.81541824340832,9.455277442932186|54.8165283203125,9.457498550415039|54.81735992431646,9.456946372985897|54.81930541992199,9.460277557373104|54.82041549682617,9.460833549499569|54.82152938842768,9.464165687561035|54.82263946533203,9.4647216796875|54.82291793823242,9.468609809875431|54.823749542236385,9.469721794128361|54.824028015136776,9.473056793212947|54.82291793823242,9.47583293914795|54.82319259643566,9.483611106872559|54.82273864746105,9.482230186462402|54.815219879150504,9.482759475708065|54.81542968750006,9.488989830017147|54.80834197998047,9.501990318298454|54.80062103271496,9.496249198913574|54.79687118530285,9.496500015258846|54.793331146240234,9.502988815307617|54.789379119873104,9.496978759765625|54.77442932128912,9.497907638549862|54.77051162719732,9.491870880126896|54.7703094482423,9.48559856414795|54.773860931396484,9.479109764099235|54.77759170532232,9.478879928588924|54.77740097045904,9.472619056701717|54.77347946166992,9.466569900512752|54.76604080200195,9.466990470886344|54.765670776367244,9.454428672790527|54.75452041625982,9.4550399780274|54.75062942504883,9.448939323425293|54.75045013427746,9.44265079498291|54.75416183471691,9.442468643188477|54.75226974487316,9.373150825500545|54.75595855712902,9.372980117797795|54.76689147949213,9.366157531738338|54.77040863037115,9.359689712524414|54.777629852295036,9.353049278259391|54.78133010864258,9.352879524230957|54.78186035156256,9.371758460998592|54.78573989868164,9.377868652343864|54.789451599121094,9.377679824829158|54.78963851928722,9.383960723876953|54.79391860961914,9.402589797973633|54.80508041381847,9.401970863342285|54.816478729248104,9.40755939483654|54.82001113891596,9.401079177856445|54.823760986328125,9.400839805603084|54.82446670532232,9.421944618225211</code></p>
</details>

![Polygon Example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/polygonexample.png)

---

### 📍 Markers

To add one or more markers, use the `markers` parameter in this format:

```
markers=markerStyle|markerCoord1|markerCoord2|...
```

- **markerCoord**: Coordinates for each marker in `lat, lon` format, separated by `|`. You need at least one coordinate.
- **markerStyle**: Customize the marker with:

  | Parameter | Default    | Description                                 |
  | --------- | ---------- | ------------------------------------------- |
  | `img`     | (optional) | URL or file path for a custom marker image. |
  | `width`   | `28`       | Sets the width of the marker.               |
  | `height`  | `28`       | Sets the height of the marker.              |
  | `offsetX` | (optional) | Horizontal offset for the marker position.  |
  | `offsetY` | (optional) | Vertical offset for the marker position.    |

**Example**: Two markers.

```
http://localhost:3000/api/staticmaps?width=600&height=600&markers=48.8566,2.3522|37.7749,-122.4194
```

![Markers Example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/markers.png)

---

### ⚪ Circles

To add a circle, use the `circle` parameter in this format:

```
circle=circleStyle|circleCoord
```

- **circleCoord**: Coordinates for the circle's center in lat, lon format, separated by |. You need at least one coordinate.
- **circleStyle**: Customize the circle with:

  | Parameter | Default    | Description                              |
  | --------- | ---------- | ---------------------------------------- |
  | `radius`  | (required) | Specifies the radius of the element.     |
  | `color`   | `#0000bb`  | Defines the stroke color of the element. |
  | `width`   | `3`        | Sets the stroke width of the element.    |
  | `fill`    | `#AA0000`  | Specifies the fill color of the element. |

**Example**: Circle with a radius of `20` meters.

```
http://localhost:3000/api/staticmaps?width=600&height=600&basemap=osm&circle=radius:20|color:4874db|fill:0000bb|width:10|48.726304979176675,-3.9829935637739382
```

![Circle Example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/circle.png)

---

### 🔤 Text

To add text, use the `text` parameter in this format:

```
text=textStyle|textCoord
```

- **textCoord**: Coordinates for the text's anchor in lat, lon format.   
- **textStyle**: Customize the text with:

  | Parameter | Default    | Description                                      |
  | --------- | ---------- | ------------------------------------------------ |
  | `text`    | (required) | The text to render.                              |
  | `color`   | `#000000BB`| Stroke color of the text                         |
  | `width`   | `1`        | Stroke width of the text                         |
  | `fill`    | `#000000`  | Fill color of the text                           |
  | `size`    | `12`       | Font-size of the text                            |
  | `font`    | `Arial`    | Font-family of the text                          |
  | `anchor`  | `start`    | Determines the text anchor alignment.            |
  | `offsetX` | `0`        | Horizontal offset relative to the coordinate.    |
  | `offsetY` | `0`        | Vertical offset relative to the coordinate.      |

**Example**: Text "Hello World" with custom styling.

```
http://localhost:3000/api/staticmaps?width=600&height=600&zoom=2&center=2.3522,48.8566&text=text:Hello%20World|size:20|offsetX:-12|offsetY:22|48.8566,2.3522
```

![Text Example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/text.png)

---

### 🔍 More usage examples

<details>
  <summary>Example with <code>width=500</code>, <code>height=500</code>, <code>center=-73.99515,40.76761</code>, <code>zoom=10</code>, <code>basemap=carto-voyager</code></summary>
  <p>http://localhost:3000/api/staticmaps?width=500&height=500&center=-73.99515,40.76761&zoom=10&format=webp&basemap=carto-voyager</p>
</details>

![Example Request 2](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/example2.webp)

<details>
  <summary>Markers and Polyline Example</summary>
  <p><code>http://localhost:3000/api/staticmaps?width=600&height=400&markers=48.8566,2.3522|40.712,-74.006&polyline=weight:3|48.8566,2.3522|40.7128,-74.006</code></p>
</details>

![Polyline & Markers](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/markersandpolyline.png)

---

Also, `POST` requests are supported:

<details>
  <summary>Example with markers, polyline, polygon and circle</summary>
  <p><code>curl -X POST http://192.168.50.26:3000/api/staticmaps \
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
}' --output custom_map.png</code></p>
</details>

![POST request example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/postrequest.png "screenshot of POST request example")

## 💻 Development

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

```bash
npm run dev
```

Enjoy building and customizing your static maps! 🌍✨
