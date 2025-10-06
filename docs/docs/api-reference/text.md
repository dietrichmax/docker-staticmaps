---
sidebar_position: 8
---

# Text

To add text, use the `text` parameter in this format:

```
text=textStyle|textCoord
```

- **textCoord**: Coordinates for the text's anchor in lat, lon format.
- **textStyle**: Customize the text with:

  | Parameter | Default     | Description                                   |
  | --------- | ----------- | --------------------------------------------- |
  | `text`    | (required)  | The text to render.                           |
  | `color`   | `#000000BB` | Stroke color of the text                      |
  | `width`   | `1`         | Stroke width of the text                      |
  | `fill`    | `#000000`   | Fill color of the text                        |
  | `size`    | `12`        | Font-size of the text                         |
  | `font`    | `Arial`     | Font-family of the text                       |
  | `anchor`  | `start`     | Determines the text anchor alignment.         |
  | `offsetX` | `0`         | Horizontal offset relative to the coordinate. |
  | `offsetY` | `0`         | Vertical offset relative to the coordinate.   |

**Example**: Text "Hello World" with custom styling.

```
http://localhost:3000/api/staticmaps?width=600&height=600&text=text:Hello%20World|size:20|48.8566,2.3522
```

![Text Example](https://raw.githubusercontent.com/dietrichmax/docker-staticmaps/refs/heads/main/examples/text.png)