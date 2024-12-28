import express from "express"
import { render, getTileUrl, checkParams } from "./utils.js"

const asyncHandler = (fun) => (req, res, next) => {
  Promise.resolve(fun(req, res, next)).catch(next)
}

const app = express()
const port = 3000

const defaultWidth = 300
const defaultHeight = 300

app.get(
  "/staticmaps",
  asyncHandler(async (req, res) => {
    const missingParams = checkParams(req)
    if (missingParams.length > 0) {
      res.status(422)
      res.send("Parameters" + missingParams.toString() + " missing!")
    } else {
      const coordinates = req.query.center.split(",")

      const lon = parseFloat(coordinates[0])
      const lat = parseFloat(coordinates[1])

      const options = {
        width: parseInt(req.query.width) || defaultWidth,
        height: parseInt(req.query.height) || defaultHeight,
        zoom: parseInt(req.query.zoom),
        center: [lon, lat],
        tileUrl: getTileUrl(req.query.tileUrl, req.query.basemap),
        format: req.query.format ? req.query.format : "png",
      }

      const img = await render(options)

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
