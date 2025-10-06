---
sidebar_position: 6
---

# Markers

To add one or more markers, use the `markers` parameter in this format:

```
markers=markerStyle|markerCoord1|markerCoord2|...
```

- **markerCoord**: Coordinates for each marker in `lat, lon` format, separated by `|`. You need at least one coordinate.
- **markerStyle**: Customize the marker with:

  | Parameter | Default | Description |
  | --- | --- | --- |
  | `img` | (optional) | URL or file path for a custom marker image. |
  | `color` | `#d9534f` | Color of the Marker. |
  | `width` | `28` | Width of marker image in px. |
  | `height` | `28` | Height of marker image in px. |
  | `drawWidth` | `width` | Resize marker image to width in px. |
  | `drawHeight` | `height` | Resize marker image to height in px. |
  | `offsetX` | `13.5` | Horizontal offset for the marker position. |
  | `offsetY` | `27.5` | Vertical offset for the marker position. |
  | `resizeMode` | `cover` | Applied resize method if needed. See: [https://sharp.pixelplumbing.com/api-resize](https://sharp.pixelplumbing.com/api-resize) |

<details>
  <summary><b>Example:</b> Multiple Markers</summary>
   <p><code>http://localhost:3000/api/staticmaps?width=1200&height=800&format=png&basemap=national-geographic&markers=color:red|37.2159,-7.0050|28.0997,-17.1092|24.0617,-74.4767|24.2000,-74.5000|23.1167,-82.3833|19.0000,-72.7000|38.7169,-27.2231|38.7169,-9.1399|37.2159,-7.0050&markers=color:green|36.5271,-6.2886|15.4150,-61.3710|16.2650,-61.5510|18.4655,-66.1057|18.4861,-69.9312|21.5218,-77.7812&markers=color:orange|36.7781,-6.3515|14.9167,-23.5167|10.6000,-61.2000|8.5833,-62.4000|18.4861,-69.9312&markers=color:blue|36.5271,-6.2886|17.9352,-76.8419|15.9194,-85.9597|9.3547,-79.9014|21.5218,-77.7812|36.5271,-6.2886</code></p>
</details>

![Markers Example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/markers.png)