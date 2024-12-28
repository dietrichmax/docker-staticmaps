import express from "express"
import { render, getTileUrl, checkParams, parseCoordinates } from "./utils.js"

const asyncHandler = (fun) => (req, res, next) => {
  Promise.resolve(fun(req, res, next)).catch(next)
}

const app = express()
const port = 3000

app.get(
  "/staticmaps",
  asyncHandler(async (req, res) => {
    const { missingParams, zoom, markers, polyline } = checkParams(req);

    if (missingParams.length > 0) {
      res.status(422)
      res.send("Parameters" + missingParams.toString() + " missing!")
    } else {
      let center
      if (req.query.center) {
        const coordinates = req.query.center.split(",")
        center = [parseFloat(coordinates[0]), parseFloat(coordinates[1])]
      }

      const options = {
        width: parseInt(req.query.width) || 300,
        height: parseInt(req.query.height) || 300,
        zoom: parseInt(req.query.zoom),
        center: center,
        coordinates: parseCoordinates(req.query.coordinates),
        markers: markers,
        polyline: polyline,
        tileUrl: getTileUrl(req.query.tileUrl, req.query.basemap),
        format: req.query.format ? req.query.format : "png",
      }

      const features = getFeatures(req)

      const img = await render(options, features)

      res.writeHead(200, {
        "Content-Type": `image/${options.format}`,
        "Content-Length": img.length,
      })
      res.end(img)
    }
  })
)

app.listen(port, () => {
  console.log(`staticmaps listening on port ${port}`)
})
