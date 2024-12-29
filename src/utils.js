import StaticMaps from "./staticmaps/staticmaps.js"
import basemaps from "./basemaps.js"

export function validateParams(req) {
  const missingParams = [] // to render feedback for missing params
  let center = null // Changed to null initially
  let polyline = false
  let markers = false

  if (req.query.center) {
    const coordinates = req.query.center.split(",")
    center = [parseFloat(coordinates[0]), parseFloat(coordinates[1])]
  }

  if (req.query.polyline) {
    let polylineWeight = 5 // default polyline weight
    let polylineColor = "blue" // default polyline color
    let removeValFromIndex = []

    let pathArray = req.query.polyline.split("|")
    let polylineCoords = pathArray
    pathArray.map((elem) => {
      if (elem.includes("color")) {
        //--> todo validate color function hex and name
        // get color param for polyline and the index of it
        removeValFromIndex.push(pathArray.indexOf(elem))
        polylineColor = elem.replace("color:", "#")
      }

      if (elem.includes("weight")) {
        // get weight param for polyline and the index of it
        removeValFromIndex.push(pathArray.indexOf(elem))
        polylineWeight = parseInt(elem.replace("weight:", ""))
      }
    })

    // remove color and weight from polyline query so coordinates are left
    if (removeValFromIndex.length > 0) {
      for (var i = removeValFromIndex.length - 1; i >= 0; i--) {
        polylineCoords.splice(removeValFromIndex[i], 1)
      }
    }

    // sort coordinates
    polylineCoords = Object.keys(pathArray).map((key) => {
      const [lat, lon] = pathArray[key].split(",").map(Number)
      return [lon, lat] // Convert to [longitude, latitude] format
    })

    polyline = {
      coords: polylineCoords,
      weight: polylineWeight,
      color: polylineColor,
    }
  }

  if (req.query.markers) {
    let markersArray = req.query.markers.split("|")
    let markersCoords = markersArray
    markersCoords = Object.keys(markersArray).map((key) => {
      const [lat, lon] = markersCoords[key].split(",").map(Number)
      return [lon, lat] // Convert to [longitude, latitude] format
    })

    markers = {
      coords: markersCoords,
    }
  }
  // Only require center if polyline or marker coordinates not provided
  if (!req.query.center && !polyline.coords && !markers.coords) {
    missingParams.push(" {center or coordinates}")
  }

  const options = {
    width: parseInt(req.query.width) || 300,
    height: parseInt(req.query.height) || 300,
    zoom: parseInt(req.query.zoom),
    center: center,
    markers: markers,
    polyline: polyline,
    tileUrl: getTileUrl(req.query.tileUrl, req.query.basemap),
    format: req.query.format || "png",
  }
  return { missingParams, options }
}

export async function render(options) {
  let finalZoom = options.zoom
  let center = options.center

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

  // Add markers only if markers object exists and we atleast one coordinates
  if (options.markers && options.markers.coords.length > 0) {
    options.markers.coords.forEach((coord) => {
      map.addMarker({
        coord: coord,
        img: "./public/images/marker-28.png",
        width: 42,
        height: 42,
        offsetX: 15,
        offsetY: 27,
      })
    })
  }

  // Add polyline only if polyline object exists and we have multiple coordinates
  if (options.polyline && options.polyline.coords.length > 1) {
    map.addLine({
      coords: options.polyline.coords,
      color: options.polyline.color,
      width: options.polyline.weight,
    })

    // Calculate polyline center and zoom only if not provided
    const bounds = getBoundingBox(options.polyline.coords)

    if (!center) {
      center = [
        (bounds.minLon + bounds.maxLon) / 2,
        (bounds.minLat + bounds.maxLat) / 2,
      ]
    }
  }

  if (finalZoom === null) {
    finalZoom = calculateZoom(bounds, options.width, options.height)
  }
  //}

  await map.render(center, finalZoom)
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

export function parseCoordinates(coordString) {
  if (!coordString) return []

  return coordString.split("|").map((coord) => {
    const [lat, lon] = coord.split(",").map(Number)
    return [lon, lat] // Convert to [longitude, latitude] format
  })
}

function getBoundingBox(coordinates) {
  const bounds = {
    minLat: Infinity,
    maxLat: -Infinity,
    minLon: Infinity,
    maxLon: -Infinity,
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

  const latRadian = (bounds.maxLat * Math.PI) / 180

  // Adjust width and height to account for padding
  const effectiveWidth = width - 2 * PADDING
  const effectiveHeight = height - 2 * PADDING

  // Calculate the width and height in pixels for the given coordinates
  const latDiff = Math.abs(bounds.maxLat - bounds.minLat)
  const lonDiff = Math.abs(bounds.maxLon - bounds.minLon)

  const latZoom = Math.floor(
    Math.log2((effectiveHeight * 360) / (latDiff * WORLD_PX))
  )
  const lonZoom = Math.floor(
    Math.log2(
      (effectiveWidth * 360) / (lonDiff * WORLD_PX * Math.cos(latRadian))
    )
  )

  // Use the more conservative (smaller) zoom level to ensure all points are visible
  return Math.min(Math.min(latZoom, lonZoom) - 1, ZOOM_MAX)
}
