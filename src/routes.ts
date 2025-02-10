/**
 * Import necessary modules from Express.
 */
import { Router, Request, Response, NextFunction } from "express"
import { render, validateParams } from "./utils.js"
import logger from "./utils/logger.js"

/**
 * Custom async handler to properly type requests and responses.
 * @param fn - The asynchronous function to handle the request.
 * @returns A middleware function that handles errors using next().
 */
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }

/**
 * Create a new Express router instance.
 */
const router = Router()

/**
 * Helper function to handle both GET and POST requests.
 * @param req - The Express request object.
 * @param res - The Express response object.
 */
async function handleRequest(req: Request, res: Response): Promise<void> {
  
  // Validate parameters based on the request method
  const { missingParams, options } = validateParams(
    req.method === "GET" ? req.query : req.body
  )

  // Check for missing parameters and send a response if any are missing
  if (missingParams.length > 0) {
    logger.warn("Missing parameters", { missingParams });
    res.status(422).json({
      error: "Missing parameters",
      missingParams,
    })
    return // Ensure function exits here
  }

  try {
  // Render the image based on the validated options
  const img = await render(options)

  logger.info("Image successfully rendered", {
    format: options.format,
    size: img.length,
  });

  // Set appropriate headers and send the rendered image as a response
  res
    .set({
      "Content-Type": `image/${options.format}`,
      "Content-Length": img.length.toString(),
    })
    .end(img)
  } catch (error) {
    logger.error("Error rendering image", { error });
    res.status(500).json({ error: "Internal Server Error" });
  }
}

/**
 * Use the helper function for both GET and POST routes.
 */
router.get("/", asyncHandler(handleRequest))
router.post("/", asyncHandler(handleRequest))

/**
 * Export the router instance for use in other parts of the application.
 */
export default router
