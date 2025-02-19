import sharp from "sharp"
import Image from "./image"
import IconMarker from "./marker"
import Polyline from "./polyline"
import MultiPolygon from "./multipolygon"
import Circle from "./circle"
import Text from "./text"
import Bound from "./bound"
import TileServerConfig from "./tileserverconfig"
import {
  workOnQueue,
  lonToX,
  latToY,
  yToLat,
  xToLon,
  meterToPixel,
  chunk,
  tileXYToQuadKey,
} from "./utils"
import logger from "../utils/logger"

const RENDER_CHUNK_SIZE = 1000

interface MapOptions {
  width: number
  height: number
  zoom: number
  center: { lat: number; lon: number }
  markers?: Array<IconMarker>
  lines?: Array<Array<Polyline>>
  tileUrl?: string
  tileSubdomains?: string[]
  tileLayers?: Array<TileServerConfigOptions>
  paddingX?: number
  paddingY?: number
  tileSize?: number
  tileRequestTimeout?: number
  tileRequestHeader?: any // Define more specific type if necessary
  tileRequestLimit?: number
  reverseY?: boolean
  zoomRange?: { min?: number; max?: number }
}

interface TileData {
  url: string
  box: any // You can specify a more precise type for 'box' if needed
}

interface TileFetchResult {
  success: boolean
  tile?: {
    url: string
    box: any
    body: Buffer
  }
  error?: string
}

interface TileServerConfigOptions {
  tileUrl?: string
  tileSubdomains?: string[]
}

class StaticMaps {
  options: MapOptions
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
  multipolygons: MultiPolygon[]
  circles: Circle[]
  text: Text[]
  bounds: Bound[]
  center: number[]
  centerX: number
  centerY: number
  zoom: number
  paddingY: number
  paddingX: number
  image: any

  constructor(options: MapOptions) {
    this.options = options

    this.tileLayers = []

    // Backward compatibility for tileLayers
    if (typeof this.options.tileLayers === "undefined") {
      const baseLayerOptions: TileServerConfigOptions = {}
      if (this.options.tileUrl) {
        baseLayerOptions.tileUrl = this.options.tileUrl
      }
      if (this.options.tileSubdomains) {
        baseLayerOptions.tileSubdomains = this.options.tileSubdomains
      }
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

    // Features
    this.markers = []
    this.lines = []
    this.multipolygons = []
    this.circles = []
    this.text = []
    this.bounds = []

    // Fields set when the map is rendered
    this.center = []
    this.centerX = 0
    this.centerY = 0
    this.zoom = 0
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
   * Adds a multipolygon to the map.
   *
   * @param {MultiPolygon} options - Options object for creating the multipolygon.
   * @returns {void}
   */
  addMultiPolygon(options: MultiPolygon): void {
    this.multipolygons.push(new MultiPolygon(options))
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
   * @param {Array<number>} center - Array of two numbers representing the longitude and latitude of the map's center.
   * @param {number} [zoom] - Zoom level for the map. If not provided, it will be calculated.
   * @returns {Promise<string>} - Promise that resolves to the SVG string representing the rendered map.
   */
  async render(center: number[], zoom?: number): Promise<string> {
    if (
      !this.lines &&
      !this.markers &&
      !this.multipolygons &&
      !(center && zoom)
    ) {
      throw new Error(
        "Cannot render empty map: Add center || lines || markers || polygons."
      )
    }

    this.center = center
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
    return this.drawFeatures()
  }

  /**
   * Calculates the common extent of all current map features.
   *
   * @param {number} [zoom] - Zoom level for calculating the extent. If not provided, it will use the default zoom.
   * @returns {Array<number>} - Array containing the minimum and maximum longitude and latitude values defining the extent.
   */
  determineExtent(zoom?: number): number[] {
    const extents: number[][] = []

    // Add bbox to extent
    if (this.center && this.center.length >= 4) extents.push(this.center)

    // Add bounds to extent
    if (this.bounds.length) {
      this.bounds.forEach((bound) => extents.push(bound.extent()))
    }

    // Add polylines and polygons to extent
    if (this.lines.length) {
      this.lines.forEach((line) => {
        extents.push(line.extent())
      })
    }

    if (this.multipolygons.length) {
      this.multipolygons.forEach((multipolygon) => {
        extents.push(multipolygon.extent())
      })
    }

    // Add circles to extent
    if (this.circles.length) {
      this.circles.forEach((circle) => {
        extents.push(circle.extent())
      })
    }

    // Add marker to extent
    for (let i = 0; i < this.markers.length; i++) {
      const marker = this.markers[i]
      if (!marker.coord) {
        throw Error("Marker coordinates undefined")
      }
      const e = [marker.coord[0], marker.coord[1]]

      if (!zoom) {
        extents.push([
          marker.coord[0],
          marker.coord[1],
          marker.coord[0],
          marker.coord[1],
        ])
        continue
      }

      // Consider the dimension of the marker
      const ePx = marker.extentPx()
      const x = lonToX(e[0], zoom)
      const y = latToY(e[1], zoom)

      extents.push([
        xToLon(x - parseFloat(ePx[0].toString()) / this.tileSize, zoom),
        yToLat(y + parseFloat(ePx[1].toString()) / this.tileSize, zoom),
        xToLon(x + parseFloat(ePx[2].toString()) / this.tileSize, zoom),
        yToLat(y - parseFloat(ePx[3].toString()) / this.tileSize, zoom),
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
   * Calculates the best zoom level for a given extent.
   *
   * @returns {number} - The optimal zoom level.
   */
  calculateZoom(): number {
    for (let z = this.zoomRange.max; z >= this.zoomRange.min; z--) {
      const extent = this.determineExtent(z)
      const width =
        (lonToX(extent[2], z) - lonToX(extent[0], z)) * this.tileSize
      if (width > this.width - this.padding[0] * 2) continue

      const height =
        (latToY(extent[1], z) - latToY(extent[3], z)) * this.tileSize
      if (height > this.height - this.padding[1] * 2) continue

      return z
    }
    return this.zoomRange.min
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

    const tiles = await this.getTiles(result)
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
    if (features.length === 0) return

    // Chunk the features for performance
    const chunks = chunk(features, RENDER_CHUNK_SIZE)

    const baseImage = sharp(this.image.image)
    const imageMetadata: any = await baseImage.metadata()

    const processedChunks = chunks.map((chunk: any) => {
      const svg = `<svg
          width="${imageMetadata.width}px"
          height="${imageMetadata.height}px"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg">
          ${chunk.map((feature: any) => svgFunction(feature)).join("\n")}
        </svg>`

      return { input: Buffer.from(svg), top: 0, left: 0 }
    })

    this.image.image = await baseImage.composite(processedChunks).toBuffer()
  }

  /**
   * Renders a circle to SVG.
   *
   * @param {Circle} circle - Circle object containing properties for rendering.
   * @returns {string} - SVG string representing the circle.
   */
  circleToSVG(circle: Circle): string {
    const latCenter = circle.coord[1]
    const radiusInPixel = meterToPixel(circle.radius, this.zoom, latCenter)
    const x = this.xToPx(lonToX(circle.coord[0], this.zoom))
    const y = this.yToPx(latToY(circle.coord[1], this.zoom))

    return `
      <circle
        cx="${x}"
        cy="${y}"
        r="${radiusInPixel}"
        style="fill-rule: inherit;"
        stroke="${circle.color}"
        fill="${circle.fill}"
        stroke-width="${circle.width}"
      />
    `
  }

  /**
   * Renders text to SVG.
   *
   * @param {Text} text - Configuration object for rendering text.
   * @returns {string} - SVG markup for the rendered text.
   */
  textToSVG(text: Text): string {
    if (!text.coord) {
      throw Error("No text coords given")
    }

    const mapcoords: [number, number] = [
      this.xToPx(lonToX(text.coord[0], this.zoom)) - text.offset[0],
      this.yToPx(latToY(text.coord[1], this.zoom)) - text.offset[1],
    ]

    return `
      <text
        x="${mapcoords[0]}"
        y="${mapcoords[1]}"
        style="fill-rule: inherit; font-family: ${text.font};"
        font-size="${text.size}pt"
        stroke="${text.color}"
        fill="${text.fill ? text.fill : "none"}"
        stroke-width="${text.width}"
        text-anchor="${text.anchor}"
      >
          ${text.text}
      </text>`
  }

  /**
   * Renders a MultiPolygon to SVG.
   *
   * @param {MultiPolygon} multipolygon - Configuration object for rendering the MultiPolygon.
   * @returns {string} - SVG markup for the rendered MultiPolygon.
   */
  multiPolygonToSVG(multipolygon: any): string {
    const shapeArrays = multipolygon.coords.map((shape: any) =>
      shape.map((coord: [number, number]) => [
        this.xToPx(lonToX(coord[0], this.zoom)),
        this.yToPx(latToY(coord[1], this.zoom)),
      ])
    )

    const pathArrays = shapeArrays.map((points: any) => {
      const startPoint = points.shift() // Get the first point to start the path

      if (!startPoint) {
        throw Error("No start point for multiPolygon")
      }

      const pathParts = [
        `M ${startPoint[0]} ${startPoint[1]}`, // Move to the first point
        ...points.map((p: [number, number]) => `L ${p[0]} ${p[1]}`), // Line to the remaining points
        "Z", // Close the path
      ]

      return pathParts.join(" ")
    })

    return `<path
      d="${pathArrays.join(" ")}"
      style="fill-rule: inherit;"
      stroke="${multipolygon.color}"
      fill="${multipolygon.fill ? multipolygon.fill : "none"}"
      stroke-width="${multipolygon.width}"/>`
  }

  /**
   * Draws a line on the map using SVG.
   *
   * @param {Line} line - Object containing line properties and coordinates.
   * @returns {string} - SVG string for the line.
   */
  lineToSVG(line: any): string {
    // Map coordinates to pixel positions
    let points = line.coords.map(
      (coord: [number, number]) =>
        `${this.xToPx(lonToX(coord[0], this.zoom))},${this.yToPx(latToY(coord[1], this.zoom))}`
    )

    // Define the SVG polyline/polygon tag
    const shapeTag = line.type === "polyline" ? "polyline" : "polygon"
    const fillValue = line.fill || "none"

    return `
      <svg xmlns="http://www.w3.org/2000/svg">
        <${shapeTag}
          style="fill-rule: inherit;"
          points="${points.join(" ")}"
          stroke="${line.color}"
          fill="${fillValue}"
          stroke-width="${line.width}"
          stroke-linejoin="bevel"
        />
      </svg>
    `
  }
  /**
   * Draws markers to the basemap.
   *
   * @returns {Promise<void>} - A promise that resolves when all markers have been drawn.
   */
  async drawMarkers(): Promise<void> {
    const queue: (() => Promise<void>)[] = []

    this.markers.forEach((marker) => {
      queue.push(async () => {
        if (!marker.position) {
          throw Error("No marker position")
        }

        const top = Math.round(marker.position[1])
        const left = Math.round(marker.position[0])

        // Check if the marker is within the bounds of the map
        if (top < 0 || left < 0 || top > this.height || left > this.width)
          return

        const markerInstance = await sharp(marker.imgData)

        // If the size of the marker is not set, fetch the metadata
        if (marker.width === null || marker.height === null) {
          const metadata: any = await markerInstance.metadata()

          if (
            Number.isFinite(metadata.width) &&
            Number.isFinite(metadata.height)
          ) {
            marker.setSize(metadata.width, metadata.height)
          } else {
            throw new Error(
              `Cannot detect image size of marker ${marker.img}. Please define manually!`
            )
          }
        }

        // Check if resizing is necessary
        if (
          marker.drawWidth !== marker.width ||
          marker.drawHeight !== marker.height
        ) {
          // Ensure `resizeMode` is a valid FitEnum value (for example: 'cover', 'contain', etc.)
          const validFitModes: Set<string> = new Set([
            "cover",
            "contain",
            "fill",
            "inside",
            "outside",
          ])
          const fitMode = validFitModes.has(marker.resizeMode)
            ? marker.resizeMode
            : "cover" // Default to 'cover' if invalid

          const resizeData: {
            fit: keyof typeof sharp.fit
            width?: number
            height?: number
          } = {
            fit: fitMode as keyof sharp.FitEnum,
          }

          if (marker.drawWidth !== marker.width) {
            resizeData.width = marker.drawWidth
          }

          if (marker.drawHeight !== marker.height) {
            resizeData.height = marker.drawHeight
          }

          await markerInstance.resize(resizeData)
        }

        // Composite the marker onto the base image
        this.image.image = await sharp(this.image.image)
          .composite([
            {
              input: await markerInstance.toBuffer(),
              top,
              left,
            },
          ])
          .toBuffer()
      })
    })

    await workOnQueue(queue)
  }

  /**
   * Draws all features to the basemap.
   *
   * This method draws lines, multipolygons, markers, text, and circles to the basemap in sequence.
   */
  async drawFeatures(): Promise<string> {
    // Collect the parts that will make up the final SVG
    let svgContent = ""

    // Draw each feature and append to the SVG content
    if (this.lines) {
      svgContent += await this.drawSVG(this.lines, (c) => this.lineToSVG(c))
    }
    if (this.multipolygons) {
      svgContent += await this.drawSVG(this.multipolygons, (c) =>
        this.multiPolygonToSVG(c)
      )
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
   * Preloads marker images from local or remote sources.
   *
   * @returns {Promise<void>}
   */
  /**
   * Preloads marker images from local or remote sources.
   *
   * @returns {Promise<void>}
   */
  loadMarker(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.markers.length) {
        resolve(true)
      }

      const icons = this.markers
        .map((m) => ({
          file: m.img || "", // Fallback to an empty string if m.img is undefined
          height: m.height ?? 20, // Use 0 if height is null or undefined
          width: m.width ?? 20, // Use 0 if width is null or undefined
        }))
        .reduce(
          (acc, curr) => {
            // Only push if `file` is not empty and it's not already in the accumulator
            if (curr.file && !acc.some((item) => item.file === curr.file)) {
              acc.push(curr)
            }
            return acc
          },
          [] as { file: string; height: number; width: number; data?: Buffer }[] // Ensure `height` and `width` are numbers
        )

      let count = 1
      icons.forEach(async (ico) => {
        const icon = ico
        let isUrl = false

        try {
          // Try to parse the URL to check if it's an absolute URL
          new URL(icon.file)
          isUrl = true
        } catch (e) {
          // If it throws, it means it's a relative path
          isUrl = false
        }

        try {
          // Load marker from remote URL
          if (isUrl) {
            const response = await fetch(icon.file, {
              method: "GET",
              headers: {
                // You can add custom headers if necessary
              },
            })

            if (!response.ok) {
              throw new Error("Failed to fetch the image")
            }

            const arrayBuffer = await response.arrayBuffer() // Get the response as a binary array buffer

            icon.data = await sharp(Buffer.from(arrayBuffer))
              .resize(icon.width, icon.height) // Resize to the specified width and height
              .toBuffer()
          } else {
            // Load marker from local fs
            icon.data = await sharp(icon.file)
              .resize(icon.width, icon.height) // Resize to the specified width and height
              .toBuffer()
          }
        } catch (err) {
          reject(new Error(String(err)))
        }

        if (count++ === icons.length) {
          // Preloaded all icons
          this.markers.forEach((mark: any) => {
            const marker = mark
            marker.position = [
              this.xToPx(lonToX(marker.coord[0], this.zoom)) - marker.offset[0],
              this.yToPx(latToY(marker.coord[1], this.zoom)) - marker.offset[1],
            ]
            const imgData = icons.find((icon) => icon.file === marker.img)
            if (imgData) {
              marker.set(imgData.data as Buffer)
            }
          })

          resolve(true)
        }
      })
    })
  }

  /**
   * Fetches a single tile image from a given URL.
   *
   * @param {TileData} data - The tile data containing the URL and other information.
   * @returns {Promise<TileFetchResult>}
   */
  async getTile(data: any) {
    const options = {
      method: "GET",
      headers: this.tileRequestHeader || {},
      timeout: this.tileRequestTimeout,
    }

    try {
      const res = await fetch(data.url, options)

      if (!res.ok) {
        throw new Error(`Failed to fetch tile: ${res.statusText}`)
      }

      const contentType = res.headers.get("content-type")

      if (contentType && !contentType.startsWith("image/")) {
        throw new Error("Tiles server response with wrong data")
      }

      // Use arrayBuffer() to handle binary data and convert it to a Node.js Buffer
      const arrayBuffer = await res.arrayBuffer()
      const body = Buffer.from(arrayBuffer) // Convert ArrayBuffer to Buffer

      return {
        success: true,
        tile: {
          url: data.url,
          box: data.box,
          body,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || error,
      }
    }
  }

  /**
   *  Fetching tiles and limit concurrent connections
   */
  async getTiles(baseLayers: Object[]) {
    const limit = this.tileRequestLimit

    // Limit concurrent connections to tiles server
    // https://operations.osmfoundation.org/policies/tiles/#technical-usage-requirements
    if (Number(limit)) {
      const aQueue = []
      const tiles: string[] = []
      for (let i = 0, j = baseLayers.length; i < j; i += limit) {
        const chunks = baseLayers.slice(i, i + limit)
        const sQueue: any = []
        aQueue.push(async () => {
          chunks.forEach((r) => {
            sQueue.push(
              (async () => {
                const tile: any = await this.getTile(r)
                tiles.push(tile)
              })()
            )
          })
          await Promise.all(sQueue)
        })
      }
      await workOnQueue(aQueue)
      return tiles
    }

    // Do not limit concurrent connections at all
    const tilePromises: any[] = []
    baseLayers.forEach((r) => {
      tilePromises.push(this.getTile(r))
    })
    return Promise.all(tilePromises)
  }
}

export default StaticMaps
