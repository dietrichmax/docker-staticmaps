import { Coordinate } from "../types/types"
import {
  lonToX,
  latToY,
  chaikinSmooth,
  douglasPeucker,
  meterToPixel,
  chunk,
  tileXYToQuadKey,
  workOnQueue,
} from "./utils"
import { Text, Polyline, Circle, IconMarker } from "./features"
import sharp from "sharp"

/**
 * Draws a map tile layer by loading and rendering tiles based on the given viewport and configuration.
 *
 * @param {Object} params - Parameters object.
 * @param {number} params.centerX - Center tile X coordinate.
 * @param {number} params.centerY - Center tile Y coordinate.
 * @param {number} params.width - Viewport width in pixels.
 * @param {number} params.height - Viewport height in pixels.
 * @param {number} params.tileSize - Tile size in pixels.
 * @param {number} params.zoom - Current zoom level.
 * @param {boolean} params.reverseY - Whether Y tile numbering is reversed (TMS vs XYZ).
 * @param {(x: number) => number} params.xToPx - Function converting tile X coordinate to pixel X position.
 * @param {(y: number) => number} params.yToPx - Function converting tile Y coordinate to pixel Y position.
 * @param {Object} params.tileManager - Tile manager instance with async getTiles method.
 * @param {(tiles: Array<Object>) => Promise<Array<Object>>} params.tileManager.getTiles - Function to load tiles by URL and bounding box.
 * @param {Object} params.image - Image rendering object with async draw method.
 * @param {(tiles: Array<Object>) => Promise<Array<Object>>} params.image.draw - Function to render tiles on the image.
 * @param {Object} params.config - Tile layer configuration.
 * @param {string} params.config.tileUrl - URL template string for tiles, supporting {z}, {x}, {y}, {s}, or {quadkey} placeholders.
 * @param {string[]} [params.config.tileSubdomains] - Optional list of subdomains for tile URL substitution.
 *
 * @returns {Promise<Array<Object>>} Promise resolving to an array of drawn tile objects.
 *
 * @throws Will throw if tileUrl is missing or tile loading/rendering fails.
 */
export async function drawLayer({
  centerX,
  centerY,
  width,
  height,
  tileSize,
  zoom,
  reverseY,
  xToPx,
  yToPx,
  tileManager,
  image,
  config,
}: {
  centerX: number
  centerY: number
  width: number
  height: number
  tileSize: number
  zoom: number
  reverseY: boolean
  xToPx: (x: number) => number
  yToPx: (y: number) => number
  tileManager: { getTiles: (tiles: any[]) => Promise<any[]> }
  image: { draw: (tiles: any[]) => Promise<any[]> }
  config: { tileUrl: string; tileSubdomains?: string[] }
}): Promise<any[]> {
  if (!config?.tileUrl) return image.draw([])

  const maxTile = 1 << zoom
  const halfWidthTiles = width / (2 * tileSize)
  const halfHeightTiles = height / (2 * tileSize)

  const xMin = Math.floor(centerX - halfWidthTiles)
  const yMin = Math.floor(centerY - halfHeightTiles)
  const xMax = Math.ceil(centerX + halfWidthTiles)
  const yMax = Math.ceil(centerY + halfHeightTiles)

  const subdomains = config.tileSubdomains ?? []

  // Pre-generate a random index function for subdomains to reduce calls to Math.random()
  const getRandomSubdomain = () =>
    subdomains.length > 0
      ? subdomains[Math.floor(Math.random() * subdomains.length)]
      : undefined

  const tilesToLoad: { url: string; box: number[] }[] = []

  for (let x = xMin; x < xMax; x++) {
    for (let y = yMin; y < yMax; y++) {
      // Wrap tiles according to zoom level limits
      const tileX = ((x % maxTile) + maxTile) % maxTile
      let tileY = ((y % maxTile) + maxTile) % maxTile
      if (reverseY) tileY = maxTile - tileY - 1

      // Generate tile URL
      let tileUrl: string
      if (config.tileUrl.includes("{quadkey}")) {
        tileUrl = config.tileUrl.replace(
          "{quadkey}",
          tileXYToQuadKey(tileX, tileY, zoom)
        )
      } else {
        tileUrl = config.tileUrl
          .replace("{z}", zoom.toString())
          .replace("{x}", tileX.toString())
          .replace("{y}", tileY.toString())
      }

      // Replace subdomain token if applicable
      if (subdomains.length > 0) {
        const subdomain = getRandomSubdomain()
        if (subdomain) tileUrl = tileUrl.replace("{s}", subdomain)
      }

      tilesToLoad.push({
        url: tileUrl,
        box: [xToPx(x), yToPx(y), xToPx(x + 1), yToPx(y + 1)],
      })
    }
  }

  const loadedTiles = await tileManager.getTiles(tilesToLoad)
  const validTiles = loadedTiles
    .filter((tile: any) => tile.success)
    .map((t: any) => t.tile)
  return image.draw(validTiles)
}

/**
 * Draws multiple SVG features onto an existing image buffer by compositing SVG overlays.
 *
 * @param {Buffer} imageBuffer - The base image buffer to draw on.
 * @param {Array} features - Array of feature objects to render as SVG.
 * @param {(feature: any) => string} svgFunction - Function that takes a feature and returns its SVG markup string.
 * @returns {Promise<Buffer>} A Promise resolving to a new image buffer with the SVG features composited.
 *
 * @throws Will reject if image metadata cannot be retrieved or compositing fails.
 */
export async function drawSVG(
  imageBuffer: Buffer,
  features: any[],
  svgFunction: (feature: any) => string
): Promise<Buffer> {
  if (features.length === 0) return imageBuffer
  const RENDER_CHUNK_SIZE = 1000

  const baseImage = sharp(imageBuffer)
  const { width, height } = await baseImage.metadata()

  // Generate SVG buffers for chunks of features to avoid huge SVGs
  const chunks = []
  for (let i = 0; i < features.length; i += RENDER_CHUNK_SIZE) {
    const chunkFeatures = features.slice(i, i + RENDER_CHUNK_SIZE)
    const svgContent = chunkFeatures.map(svgFunction).join("\n")
    const svg = `<svg width="${width}px" height="${height}px" version="1.1" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`
    chunks.push({ input: Buffer.from(svg), top: 0, left: 0 })
  }

  return baseImage.composite(chunks).toBuffer()
}

/**
 * Converts a line or polygon feature into an SVG `<path>` element string.
 *
 * @param {Object} params - Parameters object.
 * @param {Polyline} params.line - The line or polygon feature with coordinates and style properties.
 * @param {number} params.zoom - Current map zoom level for coordinate projection.
 * @param {(x: number) => number} params.xToPx - Function converting projected X coordinate to pixel value.
 * @param {(y: number) => number} params.yToPx - Function converting projected Y coordinate to pixel value.
 * @returns {string} SVG markup string representing the line or polygon.
 *
 * @throws Will return an empty string if the feature's coordinates are missing or contain fewer than two points.
 */
export function lineToSVG({
  line,
  zoom,
  xToPx,
  yToPx,
}: {
  line: Polyline
  zoom: number
  xToPx: (x: number) => number
  yToPx: (y: number) => number
}): string {
  if (!line.coords || line.coords.length < 2) return ""

  // Project coordinates to pixels
  const pixels = line.coords.map(
    ([lon, lat]: Coordinate): Coordinate => [
      xToPx(lonToX(lon, zoom)),
      yToPx(latToY(lat, zoom)),
    ]
  )

  // Smooth or use original points depending on type
  const points =
    line.type === "polygon"
      ? pixels
      : pixels.length === 2
        ? chaikinSmooth(douglasPeucker(pixels, 2), 2)
        : pixels

  const d =
    `M${points[0][0]},${points[0][1]} ` +
    points
      .slice(1)
      .map(([x, y]) => `L${x},${y}`)
      .join(" ") +
    (line.type === "polygon" ? " Z" : "")

  const dashArray =
    Array.isArray(line.strokeDasharray) && line.strokeDasharray.length > 0
      ? `stroke-dasharray="${line.strokeDasharray.join(",")}"`
      : ""

  return `
<svg xmlns="http://www.w3.org/2000/svg">
  <path
    d="${d}"
    fill="${line.fill || "none"}"
    stroke="${line.color}"
    stroke-width="${line.width}"
    stroke-linejoin="round"
    stroke-linecap="round"
    shape-rendering="geometricPrecision"
    ${dashArray}
  />
</svg>`
}

/**
 * Renders a Text feature as an SVG `<text>` element.
 *
 * @param {Object} params - Parameters object.
 * @param {Text} params.text - Text feature containing coordinates, content, and styling options.
 * @param {number} params.zoom - Current map zoom level.
 * @param {(x: number) => number} params.xToPx - Function converting projected longitude to pixel X coordinate.
 * @param {(y: number) => number} params.yToPx - Function converting projected latitude to pixel Y coordinate.
 * @returns {string} SVG markup string representing the rendered text.
 *
 * @throws {Error} Throws if text coordinates are not provided.
 */
export function textToSVG({
  text,
  zoom,
  xToPx,
  yToPx,
}: {
  text: Text
  zoom: number
  xToPx: (x: number) => number
  yToPx: (y: number) => number
}): string {
  if (!text.coord) throw new Error("No text coordinates given")

  const x = xToPx(lonToX(text.coord[0], zoom)) - (text.offset?.[0] ?? 0)
  const y = yToPx(latToY(text.coord[1], zoom)) - (text.offset?.[1] ?? 0)

  return `<text
    x="${x}" y="${y}"
    fill-rule="inherit"
    font-family="${text.font}"
    font-size="${text.size}pt"
    stroke="${text.color}"
    fill="${text.fill ?? "none"}"
    stroke-width="${text.width}"
    text-anchor="${text.anchor}"
  >${text.text}</text>`
}

/**
 * Renders a Circle feature as an SVG `<circle>` element.
 *
 * @param {Object} params - Parameters object.
 * @param {Circle} params.circle - Circle feature with center coordinates and radius.
 * @param {number} params.zoom - Current map zoom level, used for radius scaling and coordinate projection.
 * @param {(x: number) => number} params.xToPx - Function converting projected longitude to pixel X coordinate.
 * @param {(y: number) => number} params.yToPx - Function converting projected latitude to pixel Y coordinate.
 * @returns {string} SVG markup string representing the circle.
 *
 * @throws {Error} Throws if the circle's coordinates are missing or malformed.
 */
export function circleToSVG({
  circle,
  zoom,
  xToPx,
  yToPx,
}: {
  circle: Circle
  zoom: number
  xToPx: (x: number) => number
  yToPx: (y: number) => number
}): string {
  if (!Array.isArray(circle.coord) || circle.coord.length !== 2) {
    throw new Error("Invalid circle: missing or malformed coordinates.")
  }

  const r = meterToPixel(circle.radius, zoom, circle.coord[1])
  const cx = xToPx(lonToX(circle.coord[0], zoom))
  const cy = yToPx(latToY(circle.coord[1], zoom))

  return `<circle
    cx="${cx}" cy="${cy}" r="${r}"
    fill-rule="inherit"
    stroke="${circle.color}"
    fill="${circle.fill}"
    stroke-width="${circle.width}"
  />`
}

/**
 * Draws markers on the given image buffer.
 *
 * @param {Buffer} baseImageBuffer - The base image buffer to draw markers on.
 * @param {IconMarker[]} markers - Array of marker objects to draw.
 * @param {number} width - Width of the base image.
 * @param {number} height - Height of the base image.
 * @returns {Promise<Buffer>} - The updated image buffer with markers composited.
 */
export async function drawMarkers(
  baseImageBuffer: Buffer,
  markers: IconMarker[],
  width: number,
  height: number
): Promise<Buffer> {
  const queue: Array<() => Promise<void>> = []

  let imageBuffer = baseImageBuffer

  markers.forEach((marker) => {
    queue.push(async () => {
      if (!marker.coord) throw new Error("No marker coord")

      const top = Math.round(marker.coord[1])
      const left = Math.round(marker.coord[0])

      if (top < 0 || left < 0 || top > height || left > width) return

      const markerInstance = await sharp(marker.imgData)

      if (marker.width == null || marker.height == null) {
        const metadata = await markerInstance.metadata()
        if (
          Number.isFinite(metadata.width) &&
          Number.isFinite(metadata.height)
        ) {
          marker.setSize(metadata.width!, metadata.height!)
        } else {
          throw new Error(
            `Cannot detect image size of marker ${marker.img}. Please define manually!`
          )
        }
      }

      if (
        marker.drawWidth !== marker.width ||
        marker.drawHeight !== marker.height
      ) {
        const validFitModes = new Set<keyof sharp.FitEnum>([
          "cover",
          "contain",
          "fill",
          "inside",
          "outside",
        ])
        const fitMode: keyof sharp.FitEnum = validFitModes.has(
          marker.resizeMode as keyof sharp.FitEnum
        )
          ? (marker.resizeMode as keyof sharp.FitEnum)
          : "cover"

        const resizeData: sharp.ResizeOptions = { fit: fitMode }
        if (marker.drawWidth !== marker.width)
          resizeData.width = marker.drawWidth
        if (marker.drawHeight !== marker.height)
          resizeData.height = marker.drawHeight

        await markerInstance.resize(resizeData)
      }

      imageBuffer = await sharp(imageBuffer)
        .composite([{ input: await markerInstance.toBuffer(), top, left }])
        .toBuffer()
    })
  })

  await workOnQueue(queue)

  return imageBuffer
}

/**
 * Loads marker icons, either fetching them from URLs or generating default SVG icons,
 * resizes them, and updates the marker objects with image data and adjusted coordinates.
 *
 * @param {Array<IconMarker>} markers - Array of marker objects to load icons for.
 * @param {number} zoom - Current zoom level for coordinate conversion.
 * @param {Function} xToPx - Function converting longitude to pixel X coordinate.
 * @param {Function} yToPx - Function converting latitude to pixel Y coordinate.
 * @returns {Promise<boolean>} Resolves to true when all markers are loaded and updated.
 */
export async function loadMarkers(
  markers: IconMarker[],
  zoom: number,
  xToPx: (lon: number) => number,
  yToPx: (lat: number) => number
): Promise<boolean> {
  if (markers.length === 0) {
    return true
  }

  type Icon = {
    file: string
    height: number
    width: number
    color: string
    data?: Buffer
  }

  const icons: Icon[] = markers.map((m) => ({
    file: m.img || "",
    height: m.height ?? 20,
    width: m.width ?? 20,
    color: m.color || "#d9534f",
  }))

  const isValidUrl = (str: string): boolean => {
    try {
      new URL(str)
      return true
    } catch {
      return false
    }
  }

  await Promise.all(
    icons.map(async (icon) => {
      if (isValidUrl(icon.file)) {
        const response = await fetch(icon.file, { method: "GET" })
        if (!response.ok)
          throw new Error(`Failed to fetch image from ${icon.file}`)
        const arrayBuffer = await response.arrayBuffer()
        icon.data = await sharp(Buffer.from(arrayBuffer))
          .resize(icon.width, icon.height)
          .toBuffer()
      } else {
        const svgString = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${icon.width}" height="${icon.height}" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${icon.color}"/>
            <circle cx="12" cy="9" r="2.5" fill="white"/>
          </svg>
        `
        icon.data = await sharp(Buffer.from(svgString)).toBuffer()
      }
    })
  )

  markers.forEach((marker: any, index: number) => {
    const icon = icons[index]
    marker.offset = [icon.width / 2, icon.height]

    marker.coord = [
      xToPx(lonToX(marker.coord[0], zoom)) - marker.offset[0],
      yToPx(latToY(marker.coord[1], zoom)) - marker.offset[1],
    ]

    if (icon.data) {
      marker.set(icon.data)
    }
  })

  return true
}
