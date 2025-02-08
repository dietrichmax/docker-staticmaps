import { Request, Response, NextFunction } from "express"
import logger from "../utils/logger"

/**
 * API Key authentication middleware.
 * This checks if the API key is provided and valid, but it's optional based on the environment variable.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The next middleware function in the stack.
 */
export function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey =
    req.headers["x-api-key"] || req.query.api_key || req.query.API_KEY
  const allowKeylessAccess = process.env.ALLOW_API_KEYLESS_ACCESS === "true"

  // If the API_KEY environment variable is not set, log a warning but proceed
  if (!process.env.API_KEY) {
    logger.warn(
      "API Key environment variable is not set. API key validation is disabled."
    )
  }

  // If allow keyless access is enabled, proceed without validating the API key
  if (allowKeylessAccess) {
    return next()
  }

  // If the API key is provided and matches the expected one
  if (apiKey && apiKey === process.env.API_KEY) {
    return next()
  }

  // If no API key is provided or it is invalid, reject with a 403 error
  logger.warn(
    `Unauthorized access attempt from IP: ${req.ip}, using API Key: ${apiKey}`
  )
  res.status(403).json({ error: "Forbidden: Invalid or missing API key" })
}
