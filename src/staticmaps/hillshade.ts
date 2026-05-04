import sharp from "sharp"
import logger from "../utils/logger"
import { isPrivateUrl, replacePlaceholders } from "../utils/security"

const DEG = Math.PI / 180

// https://registry.opendata.aws/terrain-tiles/
const DEFAULT_HILLSHADE_TILE_URL =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"

function resolveHillshadeTileUrl(): string {
  const fromEnv = process.env.HILLSHADE_TILE_URL
  if (!fromEnv) return DEFAULT_HILLSHADE_TILE_URL
  if (isPrivateUrl(replacePlaceholders(fromEnv))) {
    logger.error(
      `Invalid HILLSHADE_TILE_URL (private/internal); falling back to default`
    )
    return DEFAULT_HILLSHADE_TILE_URL
  }
  return fromEnv
}

/** URL is resolved once at module load; env vars don't change at runtime. */
export const HILLSHADE_TILE_URL = resolveHillshadeTileUrl()

// Mapzen/Tilezen Terrarium decoding: elev = (R*256 + G + B/256) - 32768.
function decodeTerrarium(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768
}

/**
 * Render a Terrarium-encoded raster-DEM tile as grayscale shaded relief
 * suitable for `blend: 'multiply'` (output range [255*(1-intensity), 255]).
 * Edge pixels use one-sided differences; expect minor seams between tiles.
 */
export async function terrariumToHillshade(
  tileBuffer: Buffer,
  zoom: number,
  options: {
    azimuth?: number
    altitude?: number
    exaggeration?: number
    intensity?: number
  } = {}
): Promise<Buffer> {
  const azimuth = options.azimuth ?? 315
  const altitude = options.altitude ?? 45
  const exaggeration = options.exaggeration ?? 1
  const intensity = options.intensity ?? 0.6

  const { data, info } = await sharp(tileBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.height
  const ch = info.channels

  // Defensive cap: standard map tiles are 256/512px; reject anything larger
  // to bound the per-tile JS allocation regardless of upstream content-length.
  if (w > 1024 || h > 1024) {
    throw new Error(`Hillshade input tile too large: ${w}x${h}`)
  }

  const elev = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch
      elev[y * w + x] = decodeTerrarium(data[i], data[i + 1], data[i + 2])
    }
  }

  // Mid-latitude approximation. Replace with per-tile bounds for accuracy.
  const cellSize = (156543.03392 * Math.cos(45 * DEG)) / Math.pow(2, zoom)
  const zFactor = exaggeration / cellSize

  const azRad = (360 - azimuth + 90) * DEG
  const zenRad = (90 - altitude) * DEG
  const cosZen = Math.cos(zenRad)
  const sinZen = Math.sin(zenRad)

  const out = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const xL = x === 0 ? 0 : x - 1
      const xR = x === w - 1 ? w - 1 : x + 1
      const yU = y === 0 ? 0 : y - 1
      const yD = y === h - 1 ? h - 1 : y + 1
      const dx = xR - xL || 1
      const dy = yD - yU || 1

      const dzdx = ((elev[y * w + xR] - elev[y * w + xL]) / dx) * zFactor
      const dzdy = ((elev[yD * w + x] - elev[yU * w + x]) / dy) * zFactor

      const slope = Math.atan(Math.hypot(dzdx, dzdy))
      let aspect = Math.atan2(dzdy, -dzdx)
      if (aspect < 0) aspect += 2 * Math.PI

      let illum =
        cosZen * Math.cos(slope) +
        sinZen * Math.sin(slope) * Math.cos(azRad - aspect)
      if (illum < 0) illum = 0
      else if (illum > 1) illum = 1

      const gray = Math.round((1 - intensity * (1 - illum)) * 255)
      const j = (y * w + x) * 4
      out[j] = gray
      out[j + 1] = gray
      out[j + 2] = gray
      out[j + 3] = 255
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer()
}
