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

/**
 * Controller to handle incoming requests for generating static map images.
 *
 * Steps:
 * - Generate a cache key based on request
 * - Serve a cached image if it exists
 * - Parse and validate input parameters
 * - Generate map image if no cache hit
 * - Cache the result and respond with the image
 *
 * @param req - Express request object with typed query/body for map generation
 * @param res - Express response object used to return image or error
 *
 * @returns A PNG or specified format image stream or an error response
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
      logger.debug("Serving cached tile", { cacheKey, ip, route })
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
    const img = await generateMap(options)

    // Cache the generated image for future requests
    setCachedTile(cacheKey, img)

    // Determine correct content type
    const contentType =
      options.format === "pdf" ? "application/pdf" : `image/${options.format}`

    // Send the generated image as the response
    res
      .set({
        "Content-Type": contentType,
        "Content-Length": img.length.toString(),
      })
      .end(img)
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
