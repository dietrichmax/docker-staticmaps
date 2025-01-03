# Docker Static Maps API

[![Build & Publish](https://github.com/dietrichmax/docker-staticmaps/actions/workflows/pipeline.yml/badge.svg)](https://github.com/dietrichmax/docker-staticmaps/actions/workflows/pipeline.yml)

A containerized web version for [staticmaps](https://www.npmjs.com/package/staticmaps) with [express](https://github.com/expressjs/express).

**Table of Contents**
- [Usage](#usage)
  - [Basemap](#basemap)
  - [Polylines](#polylines)
  - [Polygons](#polygons)
  - [Markers](#markers)
  - [Circles](#circles)
  - [Usage examples](#more-usage-examples)
- [Deployment](#deployment)

## Usage

To get a static map from the endpoint `/staticmaps` several prameters have to be provided.

- `center` - Center coordinates of the map in the format `lon, lat`
- `zoom` - Set the zoom level for the map.
- `width` - default `300` - Width in pixels of the final image
- `height` - default `300` - Height in pixels of the final image
- `format` - default `png` (e.g. `png`, `jpg` or `webp`)
- `basemap` - default `osm` - Map base layer

### Basemap

For different basemaps docker-staticmaps is using exisiting tile-services from various providers. Be sure to check their Terms of Use for your use case or use a `custom` tileserver with the `tileUrl` parameter!

- `basemap` - default "osm" - Select the basemap
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
  - `stamen-toner-background` - [Stamen Toner](http://maps.stamen.com/toner-background/) map without labels
  - `stamen-toner-lite` - [Stamen Toner Light](http://maps.stamen.com/toner-lite/) with labels
  - `stamen-terrain` - [Stamen Terrain](http://maps.stamen.com/terrain/) with labels
  - `stamen-terrain-background` - [Stamen Terrain](http://maps.stamen.com/terrain-background/) without labels
  - `stamen-watercolor` - [Stamen Watercolor](http://maps.stamen.com/watercolor/)
  - `carto-light` - [Carto](https://carto.com/location-data-services/basemaps/) Free usage for up to 75,000 mapviews per month, non-commercial services only.
  - `carto-dark` - [Carto](https://carto.com/location-data-services/basemaps/) Free usage for up to 75,000 mapviews per month, non-commercial services only.
  - `carto-voyager` - [Carto](https://carto.com/location-data-services/basemaps/) Free usage for up to 75,000 mapviews per month, non-commercial services only.
  - `custom` - Pass through the tile URL using parameter `tileurl`

### Polylines

With the parameter `polyline` you can add a polyline to the map in the following format:

`polyline=polylineStyle|polylineCoord1|polylineCoord2|...`

- `polylineCoord` - required - in format `lat,lon` and seperated by `|`. Atleast two locations are needed to draw a polyline.

The `polylineStyle` consists of the following two parameters separated by `|`.

- `weight` - default `5` - Weight of the polyline in pixels, e.g. `weight:5`
- `color` - default `blue` -24-Bit-color hex value, e.g. `color:0000ff`

If no `center` is specified, the polyline will be centered.

**Usage example**

Polyline with no `zoom`, `weight:6` and `color:0000ff`</summary>
```
http://localhost:3000/staticmaps?width=600&height=600&polyline=weight:6|color:0000ff|48.726304979176675,-3.9829935637739382|48.72623035828412,-3.9829726446543385|48.726126671101639,-3.9829546542797467|48.725965124843256,-3.9829070729298808|48.725871429380568,-3.9828726793245273|48.725764250990267,-3.9828064532306628|48.725679557682362,-3.9827385375789146|48.72567025076134,-3.9827310750289113|48.725529844164292,-3.9826617613709225|48.725412537198615,-3.9826296635284164|48.725351694726704,-3.9826201452878531|48.725258599474508,-3.9826063049230411|48.725157520450125,-3.9825900299314232|48.725077863838543,-3.9825779905509102|48.724930435729831,-3.9825514102373938|48.724815578113535,-3.9825237355887291|48.724760905376989,-3.9825013965800564|48.724677938456551,-3.9824534296566916|48.724379435330384,-3.9822469276001118|48.724304509274596,-3.9821850264836076|48.7242453124599,-3.9821320570321772|48.724206187829317,-3.9821063430223207|48.724117073204575,-3.9820862134785551
```

![Polyline with no zoom](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/polylinepath.png)

### Polygons

With the parameter `polygon` you can add a polgon to the map in the following format:

`polygon=polygonStyle|polygonCoord1|polygonCoord2|...`

- `polygonCoord` - required - in format `lat,lon` and seperated by `|`. Atleast two locations are needed to draw a polyline. First and last locations have to be the same to close the polygon.

The `polygonStyle` consists of the following two parameters separated by `|`.

- `color` - default `blue` -24-Bit-color hex value, e.g. `color:4874db`
- `weight` - default `5` - Weight of the polygon in pixels, e.g. `weight:5`
- `fill` - default `green` -24-Bit-color hex value, e.g. `fill:eb7a34`

If no `center` is specified, the polygon will be centered.

**Usage example**

Polygon with no `zoom`, `color:4874db`,`weight:7` and `fill:eb7a3`</summary>
```
http://localhost:3000/staticmaps?width=600&height=600&polygon=color:4874db|weight:7|fill:eb7a34|41.891169,12.491691|41.890633,12.493697|41.889012,12.492989|41.889467,12.490811|41.891169,12.491691
```

![polygon with no zoom](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/polygonexample.png)

### Markers

With the parameter `markers` you can draw one or multiple markers depending on how much pair of coordinates you pass to the parameter

`markers=markerCoord1|markerCoord2|...`

- `markerCoord` - required - in format `lat,lon` and separated by `|`. Atleast one coordinate is needed to draw a marker.

If no `center` is specified, the markers will be centered.

**Usage example**

Two markers
```
http://localhost:3000/staticmaps?width=600&height=600&markers=48.726304979176675,-3.9829935637739382|48.724117073204575,-3.9820862134785551
```

![Markers with no zoom](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/markers.png)

### Circles

With the parameter `circle` you can add a circle to the map in the following format:

`circle=circleStyle|circleCoord`

- `circleCoord` - required - in format `lat,lon` and separated by `|`. Atleast one locations is needed to draw a marker.

The `circleStyle` consists of the following parameters seperated by `|`.

- `radius` - required - Circle radius in meter, e.g. `radius:500`
- `color` - default `#0000bb` -  Stroke color of the circle, e.g. `color:#0000bb`
- `width` - default `3` - Stroke width of the circle, e.g. `width:3`
- `fill` - default `#AA0000` - Fill color of the circle, e.g. `fill:#AA0000`

If no `center` is specified, the circle will be centered.

**Usage example**

Circle with no zoom
```
http://localhost:3000/staticmaps?width=600&height=600&basemap=osm&circle=radius:100|48.726304979176675,-3.9829935637739382
```

![No zoom, `polyline=true`, `markers=false`](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/circle.png)


### More usage examples

<details>
  <summary>Minimal example: `center` and `zoom`</summary>
  <p>http://localhost:3000/staticmaps?center=-119.49280,37.81084&zoom=9</p>
</details>

![Minimal example: only `center`](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/minimalexample.png "screenshot of minimal example: only `center`")

<details>
  <summary>`width=500`, `height=500`, `center=-73.99515,40.76761`, zoom=10`, `format=webp`, `basemap=carto-voyager`</summary>
  <p>http://localhost:3000/staticmaps?width=500&height=500&center=-73.99515,40.76761&zoom=10&format=webp&basemap=carto-voyager</p>
</details>

![example request 2](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/example2.webp "example request 2")

<details>
  <summary>Markers and Polyline</summary>
    <p>
      http://localhost:3000/staticmaps?width=600&height=600&polyline=weight:6|color:0000ff|48.726304979176675,-3.9829935637739382|48.72623035828412,-3.9829726446543385|48.726126671101639,-3.9829546542797467|48.725965124843256,-3.9829070729298808|48.725871429380568,-3.9828726793245273|48.725764250990267,-3.9828064532306628|48.725679557682362,-3.9827385375789146|48.72567025076134,-3.9827310750289113|48.725529844164292,-3.9826617613709225|48.725412537198615,-3.9826296635284164|48.725351694726704,-3.9826201452878531|48.725258599474508,-3.9826063049230411|48.725157520450125,-3.9825900299314232|48.725077863838543,-3.9825779905509102|48.724930435729831,-3.9825514102373938|48.724815578113535,-3.9825237355887291|48.724760905376989,-3.9825013965800564|48.724677938456551,-3.9824534296566916|48.724379435330384,-3.9822469276001118|48.724304509274596,-3.9821850264836076|48.7242453124599,-3.9821320570321772|48.724206187829317,-3.9821063430223207|48.724117073204575,-3.9820862134785551&markers=48.726304979176675,-3.9829935637739382|48.724117073204575,-3.9820862134785551
    </p>
  </details>

![No zoom, polyline and marker`](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/markersandpolyline.png)


## Deployment

**with Docker**

```
docker run -d  --name='docker-staticmaps' -p '80:3000/tcp' 'ghcr.io/dietrichmax/docker-staticmaps:latest'
```

```docker-compose.yml
services:
  docker-staticmaps:
    image: ghcr.io/dietrichmax/docker-staticmaps:latest
    container_name: docker-staticmaps
    restart: always
    ports:
      - "80:3000"
```


**with Node.js**

```js
git clone https://github.com/dietrichmax/docker-staticmaps
npm i
npm run start
```

