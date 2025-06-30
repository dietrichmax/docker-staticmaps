import logger from "../utils/logger"
import StaticMaps from "../staticmaps/staticmaps"
import { addMarkers } from "../features/addMarkers"
import { addPolylines } from "../features/addPolylines"
import { addCircles } from "../features/addCircles"
import { addTexts } from "../features/addTexts"
import { asArray } from "../features/asArray"
import { createAttributionSVG } from "../utils/attribution"
import { MapOptions } from "../types/types"

/**
 * Generates a static map image based on the provided options.
 *
 * - Instantiates StaticMaps
 * - Adds markers, polylines, polygons, circles, and texts
 * - Renders the map
 * - Optionally composites an attribution SVG overlay
 *
 * @param {MapOptions} options - Map rendering options
 * @returns A buffer containing the final image
 */
export async function generateMap(
  options: MapOptions
): Promise<{ buffer: Buffer; renderTime: number }> {
  const start = process.hrtime()
  const map = new StaticMaps(options)

  try {
    addMarkers(map, asArray(options.markers))
    addPolylines(map, asArray(options.polyline), false)
    addPolylines(map, asArray(options.polygon), true)
    addCircles(map, asArray(options.circle))
    addTexts(map, asArray(options.text))

    await map.render(options.center, options.zoom)

    if (!map.image) {
      const errMsg = "Map image is undefined after rendering"
      logger.error(errMsg)
      throw new Error(errMsg)
    }

    if (options.attribution && options.attribution.show && map.image) {
      const svg = createAttributionSVG(
        options.attribution.text,
        options.width,
        options.height
      )
      await map.image.compositeSVG(svg)
    }

    if (options.scaleBar?.enabled && map.image) {
      const latitude = options.center?.[1] ?? 0
      const svg = createScaleBarSVG({
        width: options.width,
        height: options.height,
        zoom: options.zoom || 12,
        latitude: latitude,
        units: options.scaleBar.units ?? 'metric',
        color: options.scaleBar.color ?? '#000000',
        background: options.scaleBar.background ?? '#ffffff',
        fontSize: options.scaleBar.fontSize ?? 12,
        margin: 10,
      })

      await map.image.compositeSVG(svg)
    }

    const buffer = await map.image.buffer(options.format)

    const [sec, nano] = process.hrtime(start)
    const renderTime = Math.round(sec * 1000 + nano / 1e6)

    return { buffer, renderTime }
  } catch (error) {
    logger.error("Error generating map image", {
      message: (error as Error).message,
      stack: (error as Error).stack,
      format: options.format,
    })
    throw error
  }
}


/**
 * Creates an SVG buffer for a scale bar element.
 *
 * @param {Object} options
 * @param {number} options.width - Total canvas width.
 * @param {number} options.height - Total canvas height.
 * @param {number} options.zoom - Map zoom level.
 * @param {number} options.latitude - Map center latitude.
 * @param {'metric' | 'imperial'} [options.units] - Unit system.
 * @param {'bottom-left' | 'bottom-right'} [options.position] - Placement corner.
 * @param {string} [options.color] - Line and text color.
 * @param {string} [options.background] - Background rectangle fill.
 * @param {number} [options.fontSize] - Font size in px.
 * @param {number} [options.margin] - Margin from edge.
 * @returns {Buffer} UTF-8 encoded SVG buffer.
 */
export function createScaleBarSVG({
  width,
  height,
  zoom,
  latitude,
  units = 'metric',
  color = '#000000',
  background = '#ffffff',
  fontSize = 12,
  margin = 10,
}: {
  width: number
  height: number
  zoom: number
  latitude: number
  units?: 'metric' | 'imperial'
  color?: string
  background?: string
  fontSize?: number
  margin?: number
}): Buffer {
  // meters per pixel at current latitude and zoom
  const metersPerPixel =
    (40075016.686 * Math.cos((latitude * Math.PI) / 180)) / (256 * 2 ** zoom)

  // Define scale lengths (meters for metric, miles for imperial)
  // We can add more larger values to support bigger scales
  const scaleLengthsMetric = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000] // meters
  const scaleLengthsImperial = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200] // miles

  const scaleLengths = units === 'imperial' ? scaleLengthsImperial : scaleLengthsMetric

  // Max visible meters on 25% of map width
  const maxMeters = metersPerPixel * width * 0.25

  // Find the largest scale length <= maxMeters * 2 to allow a bit more range
  // If none fits, pick the smallest scale length (could be very zoomed out)
  let scaleValue = scaleLengths[0]
  for (const len of scaleLengths) {
    if (len <= maxMeters * 2) {
      scaleValue = len
    } else {
      break
    }
  }

  const pixels = scaleValue / metersPerPixel

  // Format label for metric or imperial
  const label =
    units === 'imperial'
      ? scaleValue >= 1
        ? `${scaleValue} mi`
        : `${Math.round(scaleValue * 5280)} ft`
      : scaleValue >= 1000
      ? `${scaleValue / 1000} km`
      : `${scaleValue} m`

  const barWidth = Math.round(pixels)
  const barHeight = 6
  const padding = 6

  const textWidth = label.length * (fontSize * 0.6)
  const rectWidth = Math.max(barWidth, textWidth) + padding * 2
  const rectHeight = barHeight + fontSize + padding * 3

  const rectX = margin
  const rectY = height - margin - rectHeight

  const barX = rectX + padding
  const barY = rectY + padding
  const textX = rectX + rectWidth / 2
  const textY = barY + barHeight + fontSize + 2

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .scale-text {
          font-family: Arial, sans-serif;
          font-size: ${fontSize}px;
          fill: ${color};
          text-anchor: middle;
        }
        .scale-bg {
          fill: ${background};
        }
        .scale-bar {
          fill: ${color};
        }
      </style>
      <rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" class="scale-bg"/>
      <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" class="scale-bar"/>
      <text x="${textX}" y="${textY}" class="scale-text">${label}</text>
    </svg>
  `

  return Buffer.from(svg, 'utf-8')
}
