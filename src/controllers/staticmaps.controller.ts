import { Response } from "express"
import logger from "../utils/logger"
import {
  getCachedTile,
  setCachedTile,
  createCacheKeyFromRequest,
} from "../utils/cache"
import { MapRequest } from "../types/types"
import { generateMap } from "../generate/generateMap"
import { getMapParams } from "../generate/generateParams"
import { formatBytes } from "../utils/helpers"

/**
 * Express controller handling requests to generate static map images.
 *
 * Workflow:
 * 1. Generate a unique cache key from the incoming request parameters.
 * 2. Serve a cached image immediately if available.
 * 3. Parse and validate map parameters from the request.
 * 4. If validation fails, respond with HTTP 422 and details.
 * 5. Generate a static map image with the parsed parameters.
 * 6. Cache the generated image for future requests.
 * 7. Respond with the generated image in the requested format.
 *
 * @param {MapRequest} req - The incoming HTTP request, with typed query or body parameters for map generation.
 * @param {Response} res - The Express response object used to send the image or error response.
 * @returns {Promise<void>} Resolves after sending the image or error response.
 */
export async function handleMapRequest(
  req: MapRequest,
  res: Response
): Promise<void> {
  const method = req.method
  const ip = req.ip
  const route = req.originalUrl

  try {
    // Create a unique cache key based on request parameters
    const cacheKey = createCacheKeyFromRequest(req)
    // Check if an image with the same parameters already exists in cache
    const cachedTile = getCachedTile(cacheKey)

    if (cachedTile) {
      logger.info("Serving cached tile", { cacheKey, route })
      res.type("image/png").send(cachedTile)
      return
    }

    // Extract parameters depending on HTTP method
    const params = req.method === "GET" ? req.query : req.body

    // Parse and validate parameters required for map rendering
    const { missingParams, options } = getMapParams(params)

    // If any required parameters are missing, return a 422 Unprocessable Entity
    if (missingParams.length) {
      logger.warn("Missing parameters", { missingParams })
      res.status(422).json({ error: "Missing parameters", missingParams })
      return
    }

    // Generate the static map image based on the options
    const { buffer, renderTime } = await generateMap(options)

    // Cache the generated image for future requests
    setCachedTile(cacheKey, buffer)

    // Determine correct content type
    const contentType =
      options.format === "pdf" ? "application/pdf" : `image/${options.format}`

    // Send the generated image as the response
    res
      .set({
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
      })
      .end(buffer)
    logger.info(`Image rendered in ${renderTime} ms`, {
      size: formatBytes(buffer.length),
    })
  } catch (error) {
    logger.error("Error rendering map image", {
      message: (error as Error).message,
      stack: (error as Error).stack,
      ip,
      method,
      route,
    })

    res.status(500).json({ error: "Internal Server Error" })
  }
}
