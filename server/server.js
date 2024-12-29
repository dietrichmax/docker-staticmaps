import express from "express"
import { render, validateParams } from "./utils.js"

const asyncHandler = (fun) => (req, res, next) => {
  Promise.resolve(fun(req, res, next)).catch(next)
}

const app = express()
const port = 3000
const endpoint = "/staticmaps"

app.get(
  endpoint,
  asyncHandler(async (req, res) => {
    const { missingParams, options } = validateParams(req)

    if (missingParams.length > 0) {
      res.status(422)
      res.send("Parameters" + missingParams.toString() + " missing!")
    } else {
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
  console.log(`Endpoint: http://localhost:${port}${endpoint}`)
})
