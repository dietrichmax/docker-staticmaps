import express from "express"
import { render, validateParams } from "./utils.js"
import dotenv from 'dotenv'
dotenv.config()

const asyncHandler = (fun) => (req, res, next) => {
  Promise.resolve(fun(req, res, next)).catch(next)
}

const server = express()
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
const endpoint = process.env.PORT ? process.env.ENDPOINT : "/staticmaps"

server.get(
  endpoint,
  asyncHandler(async (req, res) => {
    const { missingParams, options } = validateParams(req.query)

    // give feedback on missing parameters
    if (missingParams.length > 0) {
      res.status(422)
      res.send("Parameters" + missingParams.toString() + " missing!")
    } else {
      // else render the map
      const img = await render(options)

      res.writeHead(200, {
        "Content-Type": `image/${options.format}`,
        "Content-Length": img.length,
      })
      res.end(img)
    }
  })
)

server.listen(port, () => {
  console.log(`[server]: http://localhost:${port}${endpoint}`)
})

export default server