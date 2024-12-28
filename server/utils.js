import StaticMaps from "../staticmaps/staticmaps.js"
import basemaps from "./basemaps.js"

export async function render(options) {
  const map = new StaticMaps({
    width: options.width,
    height: options.height,
    tileLayers: [
      {
        tileUrl: options.tileUrl,
      },
    ],
    tileSize: 256,
  })

  // Add markers and polylines only if coordinates are provided
  if (options.coordinates) {
    // Add markers if markers=true
    if (options.markers === true) {  // Strict comparison
      options.coordinates.forEach(coord => {
        map.addMarker({
          coord: coord,
          img: './public/images/marker-28.png',
          width: 42,
          height: 42,
          offsetX: 14,
          offsetY: 42
        })
      })
    }

    // Add polyline only if polyline=true and we have multiple coordinates
    if (options.polyline === true && options.coordinates.length > 1) {  // Strict comparison
      map.addLine({
        coords: options.coordinates,
        color: 'blue',
        width: 3
      })
    }

    // Calculate center and zoom if coordinates are provided
    if (!options.zoom || !options.center) {
      const bounds = getBoundingBox(options.coordinates)
      options.center = [(bounds.minLon + bounds.maxLon) / 2, (bounds.minLat + bounds.maxLat) / 2]
      options.zoom = calculateZoom(bounds, options.width, options.height)
    }
  }

  await map.render(options.center, options.zoom)
  return map.image.buffer(`image/${options.format}`, { quality: 75 })
}

export function getTileUrl(reqTileUrl, reqBasemap) {
  let tileUrl
  if (reqTileUrl) {
    tileUrl = reqTileUrl
  } else if (reqBasemap) {
    const tileUrlObj = basemaps.filter((obj) => {
      return obj.basemap === reqBasemap
    })
    return tileUrlObj[0].url
  } else {
    tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
  }
  return tileUrl
}

export function checkParams(req) {
  const missingParams = []
  let zoom

  if (req.query.zoom) {
    zoom = req.query.zoom
  } else {
    missingParams.push(" {zoom}")
  }

  // Only require center if coordinates not provided
  if (!req.query.center && !req.query.coordinates) {
    missingParams.push(" {center or coordinates}")
  }

  // Parse markers and polyline parameters
  const markers = req.query.markers === 'true'
  const polyline = req.query.polyline === 'true'

  return { missingParams, zoom, markers, polyline }
}

export function parseCoordinates(coordString) {
  if (!coordString) return []

  return coordString.split('|').map(coord => {
    const [lat, lon] = coord.split(',').map(Number)
    return [lon, lat] // Convert to [longitude, latitude] format
  })
}

function getBoundingBox(coordinates) {
  const bounds = {
    minLat: Infinity,
    maxLat: -Infinity,
    minLon: Infinity,
    maxLon: -Infinity
  }

  coordinates.forEach(([lon, lat]) => {
    bounds.minLat = Math.min(bounds.minLat, lat)
    bounds.maxLat = Math.max(bounds.maxLat, lat)
    bounds.minLon = Math.min(bounds.minLon, lon)
    bounds.maxLon = Math.max(bounds.maxLon, lon)
  })

  return bounds
}

function calculateZoom(bounds, width, height) {
  const WORLD_PX = 256
  const ZOOM_MAX = 18
  const PADDING = 20 // 20px padding on each side

  const latRadian = bounds.maxLat * Math.PI / 180

  // Adjust width and height to account for padding
  const effectiveWidth = width - (2 * PADDING)
  const effectiveHeight = height - (2 * PADDING)

  // Calculate the width and height in pixels for the given coordinates
  const latDiff = Math.abs(bounds.maxLat - bounds.minLat)
  const lonDiff = Math.abs(bounds.maxLon - bounds.minLon)

  const latZoom = Math.floor(Math.log2(effectiveHeight * 360 / (latDiff * WORLD_PX)))
  const lonZoom = Math.floor(Math.log2(effectiveWidth * 360 / (lonDiff * WORLD_PX * Math.cos(latRadian))))

  // Use the more conservative (smaller) zoom level to ensure all points are visible
  return Math.min(Math.min(latZoom, lonZoom) - 1, ZOOM_MAX)
}
