import { Image, IconMarker, Polyline, Circle, Text, Bound } from "./features"
import { lonToX, latToY, yToLat, xToLon } from "./utils"
import logger from "../utils/logger"
import {
  MapOptions,
  TileServerConfigOptions,
  Coordinate,
} from "src/types/types"
import { TileManager, TileServerConfig } from "./tilemanager"
import {
  lineToSVG,
  textToSVG,
  circleToSVG,
  drawSVG,
  drawLayer,
  drawMarkers,
  loadMarkers,
} from "./renderer"

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
   * @param {Polyline} polyline - Polyline instance to add to the map.
   * @returns {void}
   */
  addLine(polyline: Polyline): void {
    this.lines.push(polyline)
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
   * @param {Polyline} polygon - Polyline instance to add to the map as a polygon.
   * @returns {void}
   */
  addPolygon(polygon: Polyline): void {
    this.lines.push(polygon)
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
    return drawLayer({
      centerX: this.centerX,
      centerY: this.centerY,
      width: this.width,
      height: this.height,
      tileSize: this.tileSize,
      zoom: this.zoom,
      reverseY: this.reverseY,
      xToPx: this.xToPx.bind(this),
      yToPx: this.yToPx.bind(this),
      tileManager: this.tileManager,
      image: this.image,
      config,
    })
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
    this.image.image = await drawSVG(this.image.image, features, svgFunction)
  }

  /**
   * Renders a circle to SVG.
   *
   * @param {Circle} circle - Circle object containing properties for rendering.
   * @returns {string} - SVG string representing the circle.
   */
  circleToSVG(circle: Circle): string {
    return circleToSVG({
      circle,
      zoom: this.zoom,
      xToPx: this.xToPx.bind(this),
      yToPx: this.yToPx.bind(this),
    })
  }

  /**
   * Renders text to SVG.
   *
   * @param {Text} text - Configuration object for rendering text.
   * @returns {string} - SVG markup for the rendered text.
   */
  textToSVG(text: Text): string {
    return textToSVG({
      text,
      zoom: this.zoom,
      xToPx: this.xToPx.bind(this),
      yToPx: this.yToPx.bind(this),
    })
  }

  /**
   * Draws a line on the map using SVG.
   *
   * @param {Line} line - Object containing line properties and coordinates.
   * @returns {string} - SVG string for the line.
   */
  lineToSVG(line: Polyline): string {
    return lineToSVG({
      line,
      zoom: this.zoom,
      xToPx: this.xToPx.bind(this),
      yToPx: this.yToPx.bind(this),
    })
  }

  /**
   * Draws all markers onto the current image.
   *
   * @returns {Promise<void>} A promise that resolves once all markers have been drawn.
   */
  async drawMarkers(): Promise<void> {
    this.image.image = await drawMarkers(
      this.image.image,
      this.markers,
      this.width,
      this.height
    )
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

  /**
   * Loads marker icons and updates marker objects.
   *
   * @returns {Promise<boolean>} Resolves to true when markers are loaded successfully.
   */
  async loadMarker(): Promise<boolean> {
    return loadMarkers(
      this.markers,
      this.zoom,
      this.xToPx.bind(this),
      this.yToPx.bind(this)
    )
  }
}

export default StaticMaps
