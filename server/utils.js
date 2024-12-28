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
  let center
  
  if (req.query.zoom) {
    zoom = req.query.zoom
  } else {
    missingParams.push(" {zoom}")
  }

  if (req.query.center) {
    center = req.query.center
  } else {
    missingParams.push(" {center}")
  }

  return missingParams
}