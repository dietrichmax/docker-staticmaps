import sharp from "sharp"
import { Image, IconMarker, Polyline, Circle, Text, Bound } from "./features"
import {
  workOnQueue,
  lonToX,
  latToY,
  yToLat,
  xToLon,
  meterToPixel,
  chunk,
  tileXYToQuadKey,
  douglasPeucker,
  chaikinSmooth,
} from "./utils"
import logger from "../utils/logger"
import {
  MapOptions,
  TileServerConfigOptions,
  Coordinate,
} from "src/types/types"
import { TileManager, TileServerConfig } from "./tilemanager"

const RENDER_CHUNK_SIZE = 1000

class StaticMaps {
  options: MapOptions
  tileManager: TileManager
  tileLayers: TileServerConfig[]
  width: number
  height: number
  padding: number[]
  tileSize: number
  tileRequestTimeout?: number
  tileRequestHeader?: any
  tileRequestLimit: number
  reverseY: boolean
  zoomRange: { min: number; max: number }
  markers: IconMarker[]
  lines: Polyline[]
  circles: Circle[]
  text: Text[]
  bounds: Bound[]
  center: number[]
  centerX: number
  centerY: number
  zoom: number
  quality: number
  paddingY: number
  paddingX: number
  image: any

  constructor(options: MapOptions) {
    this.options = options
    this.tileLayers = []

    if (this.options.tileLayers === undefined) {
      const baseLayerOptions: TileServerConfigOptions = {}

      if (this.options.tileUrl) baseLayerOptions.tileUrl = this.options.tileUrl
      if (this.options.tileSubdomains)
        baseLayerOptions.tileSubdomains = this.options.tileSubdomains

      this.tileLayers.push(new TileServerConfig(baseLayerOptions))
    } else {
      this.options.tileLayers.forEach((layerConfig) => {
        this.tileLayers.push(new TileServerConfig(layerConfig))
      })
    }

    this.width = this.options.width
    this.height = this.options.height
    this.paddingX = this.options.paddingX || 0
    this.paddingY = this.options.paddingY || 0
    this.padding = [this.paddingX, this.paddingY]
    this.tileSize = this.options.tileSize || 256
    this.tileRequestTimeout = this.options.tileRequestTimeout
    this.tileRequestHeader = this.options.tileRequestHeader
    this.tileRequestLimit = Number.isFinite(this.options.tileRequestLimit)
      ? Number(this.options.tileRequestLimit)
      : 2
    this.reverseY = this.options.reverseY || false
    const zoomRange = this.options.zoomRange || {}
    this.zoomRange = {
      min: zoomRange.min || 1,
      max: this.options.zoomRange?.max || 17, // maxZoom
    }
    this.quality = this.options.quality || 100

    // Features
    this.markers = []
    this.lines = []
    this.circles = []
    this.text = []
    this.bounds = []

    // Fields set when the map is rendered
    this.center = []
    this.centerX = 0
    this.centerY = 0
    this.zoom = 0

    // TileManager
    this.tileManager = new TileManager({
      tileLayers: this.tileLayers,
      tileRequestTimeout: this.tileRequestTimeout,
      tileRequestHeader: this.tileRequestHeader,
      tileRequestLimit: this.tileRequestLimit,
      reverseY: this.reverseY,
    })
  }

  /**
   * Adds a polyline to the map.
   *
   * @param {Polyline} options - Options object for creating the polyline.
   * @returns {void}
   */
  addLine(options: Polyline): void {
    this.lines.push(new Polyline(options))
  }

  /**
   * Adds a marker to the map.
   *
   * @param {Marker} options - Options object for creating a marker.
   * @returns {void}
   */
  addMarker(options: IconMarker): void {
    this.markers.push(
      new IconMarker({
        ...options,
        height: options.height ?? undefined, // Convert `null` to `undefined`
        width: options.width ?? undefined, // Convert `null` to `undefined`
      })
    )
  }

  /**
   * Adds a polygon to the map.
   *
   * @param {Polyline} options - Options object for creating the polygon.
   * @returns {void}
   */
  addPolygon(options: Polyline): void {
    this.lines.push(new Polyline(options))
  }

  /**
   * Adds a circle to the map.
   *
   * @param {Circle} options - Options object for creating the circle.
   * @returns {void}
   */
  addCircle(options: Circle): void {
    this.circles.push(new Circle(options))
  }

  /**
   * Adds a bounding box to the map.
   *
   * @param {Bound} options - Options object for creating the bounding box.
   * @returns {void}
   */
  addBound(options: Bound): void {
    this.bounds.push(new Bound(options))
  }

  /**
   * Adds text to the map.
   *
   * @param {Text} options - Options object for creating the text.
   * @returns {void}
   */
  addText(options: Text): void {
    this.text.push(new Text(options))
  }

  /**
   * Renders a static map with all map features that were added to the map before.
   *
   * @param {Coordinate} [center] - Optional array of two numbers representing the longitude and latitude of the map's center. If omitted, center is calculated from map features.
   * @param {number} [zoom] - Optional zoom level for the map. If not provided, it will be calculated.
   * @returns {Promise<string>} - Promise that resolves to the SVG string representing the rendered map.
   */
  async render(center?: Coordinate, zoom?: number): Promise<string> {
    if (
      !center &&
      this.markers.length === 0 &&
      this.lines.length === 0 &&
      this.circles.length === 0 &&
      this.text.length === 0
    ) {
      throw new Error(
        "Cannot render empty map: Add center || lines || markers || circles."
      )
    }

    this.center = center!
    this.zoom = zoom || this.calculateZoom()

    const maxZoom = this.zoomRange.max
    if (maxZoom && this.zoom > maxZoom) this.zoom = maxZoom

    if (center && center.length === 2) {
      this.centerX = lonToX(center[0], this.zoom)
      this.centerY = latToY(center[1], this.zoom)
    } else {
      // Get extent of all lines
      const extent = this.determineExtent(this.zoom)

      // Calculate center point of map
      const centerLon = (extent[0] + extent[2]) / 2
      const centerLat = (extent[1] + extent[3]) / 2

      this.centerX = lonToX(centerLon, this.zoom)
      this.centerY = latToY(centerLat, this.zoom)
    }

    this.image = new Image(this.options)

    // Await drawLayer for each tile layer
    for (const layer of this.tileLayers) {
      await this.drawLayer(layer)
    }

    await this.loadMarker()

    logger.debug("Rendering map with center and zoom", {
      center: [this.centerX, this.centerY],
      zoom: this.zoom,
    })

    return this.drawFeatures()
  }

  /**
   * Calculates the bounding extent [minLon, minLat, maxLon, maxLat] that covers
   * all map features including bounds, lines, circles, markers, and optionally the center.
   *
   * When a zoom level is provided, marker extents are expanded in geographic coordinates
   * based on their pixel extents at that zoom, accounting for marker icon sizes.
   *
   * @param {number} [zoom] - Optional zoom level to calculate marker extents in geographic coordinates.
   *                          If omitted, markers are treated as points without extent.
   * @returns {number[]} Bounding box array with [minLongitude, minLatitude, maxLongitude, maxLatitude].
   *                     Coordinates are in EPSG:4326 geographic degrees.
   * @throws {Error} Throws if any marker has undefined coordinates.
   */
  determineExtent(zoom?: number): number[] {
    const extents: number[][] = []

    // Helper to safely add extent if defined and has length 4
    const addExtent = (e: number[] | undefined) => {
      if (e && e.length === 4) extents.push(e)
    }

    // Add center if it's a bbox extent
    addExtent(this.center)

    // Add extents from collections
    ;[this.bounds, this.lines, this.circles].forEach((collection) =>
      collection.forEach((item) => addExtent(item.extent()))
    )

    this.text.forEach((text) => addExtent(text.extent(zoom, this.tileSize)))

    // Add marker extents
    for (const marker of this.markers) {
      if (!marker.coord) throw Error("Marker coordinates undefined")

      if (!zoom) {
        extents.push([
          marker.coord[0],
          marker.coord[1],
          marker.coord[0],
          marker.coord[1],
        ])
        continue
      }

      const [lon, lat] = marker.coord
      const ePx = marker.extentPx()
      const x = lonToX(lon, zoom)
      const y = latToY(lat, zoom)
      extents.push([
        xToLon(x - ePx[0] / this.tileSize, zoom),
        yToLat(y + ePx[1] / this.tileSize, zoom),
        xToLon(x + ePx[2] / this.tileSize, zoom),
        yToLat(y - ePx[3] / this.tileSize, zoom),
      ])
    }

    return [
      Math.min(...extents.map((e) => e[0])),
      Math.min(...extents.map((e) => e[1])),
      Math.max(...extents.map((e) => e[2])),
      Math.max(...extents.map((e) => e[3])),
    ]
  }

  /**
   * Calculates the optimal zoom level to fit all map features within the map view,
   * respecting the configured width, height, and padding.
   *
   * The method:
   * - Determines the bounding extent of all features.
   * - Iterates from the maximum zoom level down to the minimum zoom level.
   * - For each zoom, calculates if the extent fits within the available map area.
   * - Returns the highest zoom level where the extent fits.
   * - If no features exist or extent is invalid, returns the minimum zoom.
   *
   * @returns {number} The best zoom level that fits all features within the view,
   *                   or the minimum zoom if no features or no zoom fits.
   */
  calculateZoom(): number {
    const { min: minZoom = 1, max: maxZoom = 20 } = this.zoomRange || {}

    // Determine extent once, without zoom or at min zoom
    const extent = this.determineExtent()

    // Validate extent (must be 4 numbers and valid box)
    if (
      !extent ||
      extent.length !== 4 ||
      extent[0] === Infinity ||
      extent[1] === Infinity ||
      extent[2] === -Infinity ||
      extent[3] === -Infinity ||
      extent[0] > extent[2] ||
      extent[1] > extent[3]
    ) {
      // No valid extent, so no features to zoom on => return min zoom
      return minZoom
    }

    for (let z = maxZoom; z >= minZoom; z--) {
      const extentZ = this.determineExtent(z)
      const widthPx =
        (lonToX(extentZ[2], z) - lonToX(extentZ[0], z)) * this.tileSize
      if (widthPx > this.width - this.padding[0] * 2) continue

      const heightPx =
        (latToY(extentZ[1], z) - latToY(extentZ[3], z)) * this.tileSize
      if (heightPx > this.height - this.padding[1] * 2) continue

      return z
    }

    // No zoom level fits, return min zoom as fallback
    return minZoom
  }

  /**
   * Transforms a tile number to a pixel coordinate on the image canvas.
   *
   * @param {number} x - The tile number in the x direction.
   * @returns {number} - The pixel coordinate on the image canvas.
   */
  xToPx(x: number): number {
    const px = (x - this.centerX) * this.tileSize + this.width / 2
    return Math.round(px) // Return rounded number as a number type
  }

  /**
   * Transforms a tile number to a pixel coordinate on the image canvas.
   *
   * @param {number} y - The tile number in the y direction.
   * @returns {number} - The pixel coordinate on the image canvas.
   */
  yToPx(y: number): number {
    const px = (y - this.centerY) * this.tileSize + this.height / 2
    return Math.round(px) // Return rounded number as a number type
  }

  /**
   * Draws a layer based on the provided configuration.
   *
   * @param {Object} config - Configuration object for drawing the layer.
   * @param {string} config.tileUrl - URL template for fetching tiles. May include placeholders like `{z}`, `{x}`, `{y}`, or `{quadkey}`.
   * @param {Array<string>} [config.tileSubdomains] - Optional array of subdomains to use in tile URLs.
   * @returns {Promise<Array<Object>>} - Promise resolving to an array of drawn tiles.
   */
  async drawLayer(config: any) {
    if (!config || !config.tileUrl) {
      // Early return if we shouldn't draw a base layer
      logger.debug("1")
      return this.image.draw([])
    }
    const xMin = Math.floor(this.centerX - (0.5 * this.width) / this.tileSize)
    const yMin = Math.floor(this.centerY - (0.5 * this.height) / this.tileSize)
    const xMax = Math.ceil(this.centerX + (0.5 * this.width) / this.tileSize)
    const yMax = Math.ceil(this.centerY + (0.5 * this.height) / this.tileSize)

    const result = []

    for (let x = xMin; x < xMax; x++) {
      for (let y = yMin; y < yMax; y++) {
        // # x and y may have crossed the date line
        const maxTile = 2 ** this.zoom
        const tileX = (x + maxTile) % maxTile
        let tileY = (y + maxTile) % maxTile
        if (this.reverseY) tileY = (1 << this.zoom) - tileY - 1

        let tileUrl
        if (config.tileUrl.includes("{quadkey}")) {
          const quadKey = tileXYToQuadKey(tileX, tileY, this.zoom)
          tileUrl = config.tileUrl.replace("{quadkey}", quadKey)
        } else {
          tileUrl = config.tileUrl
            .replace("{z}", this.zoom)
            .replace("{x}", tileX)
            .replace("{y}", tileY)
        }

        if (config.tileSubdomains.length > 0) {
          // replace subdomain with random domain from tileSubdomains array
          tileUrl = tileUrl.replace(
            "{s}",
            config.tileSubdomains[
              Math.floor(Math.random() * config.tileSubdomains.length)
            ]
          )
        }

        result.push({
          url: tileUrl,
          box: [
            this.xToPx(x),
            this.yToPx(y),
            this.xToPx(x + 1),
            this.yToPx(y + 1),
          ],
        })
      }
    }

    const tiles = await this.tileManager.getTiles(result)
    return this.image.draw(
      tiles.filter((v: any) => v.success).map((v: any) => v.tile)
    )
  }

  /**
   * Draws SVG features on the image.
   *
   * @param {Feature[]} features - Array of feature objects to be drawn.
   * @param {Function} svgFunction - Function that generates SVG markup for a given feature.
   * @returns {Promise<void>} - Promise that resolves when the drawing is complete.
   */
  async drawSVG(
    features: any[],
    svgFunction: (feature: any) => string
  ): Promise<void> {
    if (!features.length) return

    const baseImage = sharp(this.image.image)
    const { width, height } = await baseImage.metadata()

    const chunks = chunk(features, RENDER_CHUNK_SIZE).map((chunk) => {
      const svgContent = chunk.map(svgFunction).join("\n")
      const svg = `<svg width="${width}px" height="${height}px" version="1.1" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`
      return { input: Buffer.from(svg), top: 0, left: 0 }
    })

    this.image.image = await baseImage.composite(chunks).toBuffer()
  }

  /**
   * Renders a circle to SVG.
   *
   * @param {Circle} circle - Circle object containing properties for rendering.
   * @returns {string} - SVG string representing the circle.
   */
  circleToSVG(circle: Circle): string {
    if (!Array.isArray(circle.coord) || circle.coord.length !== 2) {
      throw new Error("Invalid circle: missing or malformed coordinates.")
    }
    const lat = circle.coord[1]
    const r = meterToPixel(circle.radius, this.zoom, lat)
    const cx = this.xToPx(lonToX(circle.coord[0], this.zoom))
    const cy = this.yToPx(latToY(lat, this.zoom))

    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill-rule="inherit" stroke="${circle.color}" fill="${circle.fill}" stroke-width="${circle.width}" />`
  }

  /**
   * Renders text to SVG.
   *
   * @param {Text} text - Configuration object for rendering text.
   * @returns {string} - SVG markup for the rendered text.
   */
  textToSVG(text: Text): string {
    if (!text.coord) throw Error("No text coords given")

    const x = this.xToPx(lonToX(text.coord[0], this.zoom)) - text.offset[0]
    const y = this.yToPx(latToY(text.coord[1], this.zoom)) - text.offset[1]

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
   * Draws a line on the map using SVG.
   *
   * @param {Line} line - Object containing line properties and coordinates.
   * @returns {string} - SVG string for the line.
   */
  lineToSVG(line: any): string {
    const pixels = line.coords.map(([lon, lat]: Coordinate) => [
      this.xToPx(lonToX(lon, this.zoom)),
      this.yToPx(latToY(lat, this.zoom)),
    ])

    if (pixels.length < 2) return ""

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
        .map(([x, y]: [number, number]) => `L${x},${y}`)
        .join(" ")
    const dashArray =
      Array.isArray(line.strokeDasharray) && line.strokeDasharray.length > 0
        ? `stroke-dasharray="${line.strokeDasharray.join(",")}"`
        : ""

    return `
    <svg xmlns="http://www.w3.org/2000/svg">
      <path
        d="${d}${line.type === "polygon" ? " Z" : ""}"
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

  async drawMarkers(): Promise<void> {
    const queue: Array<() => Promise<void>> = []

    this.markers.forEach((marker) => {
      queue.push(async () => {
        if (!marker.coord) throw new Error("No marker coord")

        const top = Math.round(marker.coord[1])
        const left = Math.round(marker.coord[0])

        if (top < 0 || left < 0 || top > this.height || left > this.width)
          return

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

        this.image.image = await sharp(this.image.image)
          .composite([{ input: await markerInstance.toBuffer(), top, left }])
          .toBuffer()
      })
    })

    await workOnQueue(queue)
  }

  /**
   * Draws all features to the basemap.
   *
   * This method draws lines, markers, text, and circles to the basemap in sequence.
   */
  async drawFeatures(): Promise<string> {
    // Collect the parts that will make up the final SVG
    let svgContent = ""

    // Draw each feature and append to the SVG content
    if (this.lines) {
      svgContent += await this.drawSVG(this.lines, (c) => this.lineToSVG(c))
    }
    if (this.text) {
      svgContent += await this.drawSVG(this.text, (c) => this.textToSVG(c))
    }
    if (this.circles) {
      svgContent += await this.drawSVG(this.circles, (c) => this.circleToSVG(c))
    }
    if (this.markers) {
      svgContent += await this.drawMarkers()
    }

    // Return the final SVG string
    return svgContent
  }

  async loadMarker(): Promise<boolean> {
    if (this.markers.length === 0) {
      return true
    }

    type Icon = {
      file: string
      height: number
      width: number
      color: string
      data?: Buffer
    }

    const icons: Icon[] = this.markers.map((m) => ({
      file: m.img || "",
      height: m.height ?? 20,
      width: m.width ?? 20,
      color: m.color || "#d9534f",
    }))

    // Helper to check if a string is a valid URL
    const isValidUrl = (str: string): boolean => {
      try {
        new URL(str)
        return true
      } catch {
        return false
      }
    }

    // Load each icon (either from remote URL or generate SVG)
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

    // After loading all icons, assign them to markers with offset and coordinate adjustment
    this.markers.forEach((marker: any, index: number) => {
      const icon = icons[index]
      marker.offset = [icon.width / 2, icon.height]

      marker.coord = [
        this.xToPx(lonToX(marker.coord[0], this.zoom)) - marker.offset[0],
        this.yToPx(latToY(marker.coord[1], this.zoom)) - marker.offset[1],
      ]

      if (icon.data) {
        marker.set(icon.data)
      }
    })

    return true
  }
}

export default StaticMaps
