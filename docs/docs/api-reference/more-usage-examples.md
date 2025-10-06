---
sidebar_position: 9
---

# More usage examples

<details>
  <summary>Example with <code>width=500</code>, <code>height=500</code>, <code>center=-73.99515,40.76761</code>, <code>zoom=10</code>, <code>basemap=national-geographic</code></summary>
  <p>http://localhost:3000/api/staticmaps?width=500&height=500&center=40.76761,-73.99515&zoom=10&format=webp&basemap=national-geographic</p>
</details>

![Example Request 2](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/example2.webp)

<details>
  <summary>Multiple Markers and multiple Polylines with encodedPolyline aswell as lon,lat coordinatesExample and a custom attribution</summary>
  <p><code>http://localhost:3000/api/staticmaps?width=1200&height=800&format=png&basemap=national-geographic&polyline=weight:6|color:red|kvcbFfdwi@fosv@fnt|@ntsWzqc}Ik_ZrpCrqrErubo@j`cXsgbz@&polyline=weight:6|color:red|strokeDasharray:10,15|_}}rB~evzLs}iwBseqtG?_{jmBfddHc~_L&polyline=weight:6|color:green|ke}}Evfke@rmz_C~geoIo_eD~cb@cxlLzqxZw_CjdjVc|oQne|n@&polyline=weight:6|color:orange|cfn_Fzowe@vxldCnqwgBjbjYr__eFj{hK~jiFocm{@~|}l@@&polyline=weight:6|color:blue|ke}}Evfke@jfnpBb}rmLvuhKfysv@jdag@kg~c@kkgiAgb}KcvqzAwkjsL&text=text:First%20Voyage%20(1492%E2%80%931493)|size:20|color:red|38.7169,-27.2231&text=text:Second%20Voyage%20(1493%E2%80%931496)|size:20|color:green|offsetX:-230|18.4655,%20-66.1057&text=text:Third%20Voyage%20(1498%E2%80%931500)|size:20|offsetY:-10|color:orange|8.5833,-62.4000&&text=text:Fourth%20Voyage%20(1502%E2%80%931504)|size:20|color:blue|offsetY:-30|offsetX:50|9.3547,-79.9014&markers=color:red|37.2159,-7.0050|28.0997,-17.1092|24.0617,-74.4767|24.2000,-74.5000|23.1167,-82.3833|19.0000,-72.7000|38.7169,-27.2231|38.7169,-9.1399|37.2159,-7.0050&markers=color:green|36.5271,-6.2886|15.4150,-61.3710|16.2650,-61.5510|18.4655,-66.1057|18.4861,-69.9312|21.5218,-77.7812&markers=color:orange|36.7781,-6.3515|14.9167,-23.5167|10.6000,-61.2000|8.5833,-62.4000|18.4861,-69.9312&markers=color:blue|36.5271,-6.2886|17.9352,-76.8419|15.9194,-85.9597|9.3547,-79.9014|21.5218,-77.7812|36.5271,-6.2886&attribution=text:Esri,%20USGS%20Esri,%20TomTom,%20FAO,%20NOAA,%20USGS</code></p>
</details>

![Polyline & Markers](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/markersandpolyline.png)

---

Also, `POST` requests are supported:

<details>
  <summary>Example with markers, polyline, polygon and circle</summary>
</details>

![POST request example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/postrequest.png "screenshot of POST request example")
