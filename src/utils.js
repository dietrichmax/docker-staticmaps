import StaticMaps from "./staticmaps/staticmaps.js"
import basemaps from "./basemaps.js"

export function validateParams(req) {
  const missingParams = [] // to render feedback for missing params
  let center = null // Changed to null initially
  let polyline = false
  let markers = false
  let circle = false

  // get center from query
  if (req.query.center) {
    const coordinates = req.query.center.split(",")
    center = [parseFloat(coordinates[0]), parseFloat(coordinates[1])]
  }

  // define polyline options from query
  if (req.query.polyline) {
    let polylineWeight = 5 // default polyline weight
    let polylineColor = "blue" // default polyline color
    let removeValFromIndex = []

    let polylineArray = req.query.polyline.split("|")
    let polylineCoords = polylineArray
    polylineArray.map((elem) => {
      if (elem.includes("color")) {
        //--> todo validate color function hex and name
        // get color param for polyline and the index of it
        removeValFromIndex.push(polylineArray.indexOf(elem))
        polylineColor = elem.replace("color:", "#")
      }

      if (elem.includes("weight")) {
        // get weight param for polyline and the index of it
        removeValFromIndex.push(polylineArray.indexOf(elem))
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
    polylineCoords = parseCoordinates(polylineArray)

    polyline = {
      coords: polylineCoords,
      weight: polylineWeight,
      color: polylineColor,
    }
  }

  // define marker options from query
  if (req.query.markers) {
    let markersArray = req.query.markers.split("|")
    let markersCoords = markersArray

    markersCoords = parseCoordinates(markersArray)

    markers = {
      coords: markersCoords,
    }
  }

  // define circle options from query
  if (req.query.circle) {
    let circleRadius // required
    let circleColor = "#0000bb" // 	(optional) Stroke color of the circle
    let circleWidth = 3 // (optional) Stroke width of the circle
    let circleFill = "#AA0000" // (optional) Fill color of the circle
    let removeValFromIndex = []

    let circleArray = req.query.circle.split("|")
    let circleCoord = circleArray
    circleArray.map((elem) => {
      if (elem.includes("radius")) {
        //--> todo validate color function hex and name
        // get radius param for circle and the index of it
        removeValFromIndex.push(circleArray.indexOf(elem))
        circleRadius = parseInt(elem.replace("radius:", ""))
      }

      if (elem.includes("color")) {
        // get color param for circle and the index of it
        removeValFromIndex.push(circleArray.indexOf(elem))
        circleColor = elem.replace("color:", "#")
      }

      if (elem.includes("width")) {
        // get width param for circle and the index of it
        removeValFromIndex.push(circleArray.indexOf(elem))
        circleWidth = parseInt(elem.replace("width:", ""))
      }

      if (elem.includes("fill")) {
        // get fill param for circle and the index of it
        removeValFromIndex.push(circleArray.indexOf(elem))
        circleFill = elem.replace("fill:", "#")
      }
    })

    // remove params from circle query so only coordinates are left
    if (removeValFromIndex.length > 0) {
      for (var i = removeValFromIndex.length - 1; i >= 0; i--) {
        circleCoord.splice(removeValFromIndex[i], 1)
      }
    }
    
    // sort coordinates
    circleCoord = parseCoordinates(circleArray)[0]

    circle = {
      coord: circleCoord,
      radius: circleRadius,
      color: circleColor,
      width: circleWidth,
      fill: circleFill,
    }

  }

  // Only require center if polyline or marker coordinates not provided
  if (!req.query.center && !polyline.coords && !markers.coords && !circle.coord) {
    missingParams.push(" {center or coordinates}")
  }

  // create options which will be passed to staticmaps render()
  const options = {
    width: parseInt(req.query.width) || 300,
    height: parseInt(req.query.height) || 300,
    zoom: parseInt(req.query.zoom),
    center: center,
    markers: markers,
    polyline: polyline,
    circle: circle,
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
        offsetX: 13.6,
        offsetY: 27.6,
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
  }

  // Add circles only if circle object exists and we atleast one coordinates
  if (options.circle && options.circle.coord.length > 0) {
    map.addCircle({
      coord: options.circle.coord,
      radius: options.circle.radius,
      color: options.circle.coord,
      fill: options.circle.fill,
      width: options.circle.width,
    })

  }

  /*if (finalZoom === null) {
    finalZoom = calculateZoom(bounds, options.width, options.height)
  }*/

  await map.render(center, finalZoom)
  return map.image.buffer(`image/${options.format}`, { quality: 80 })
}

export function getTileUrl(reqTileUrl, reqBasemap) {
  let tileUrl
  // use custom tileUrl if exisiting
  if (reqTileUrl) {
    tileUrl = reqTileUrl
  // use predfined tileserver based on param basemap
  } else if (reqBasemap) {
    const tileUrlObj = basemaps.filter((obj) => {
      return obj.basemap === reqBasemap
    })
    return tileUrlObj[0].url
  // else use osm tileserver as default
  } else {
    tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
  }
  return tileUrl
}

export function parseCoordinates(coordString) {
  if (!coordString) return []

  return Object.keys(coordString).map((key) => {
    const [lat, lon] = coordString[key].split(",").map(Number)
    return [lon, lat] // Convert to [longitude, latitude] format
  })
}

/*/ calculate bounding base for given coordinates
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

// calculate zoom to fit given boundingBox
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
}*/
