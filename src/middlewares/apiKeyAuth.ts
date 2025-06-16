import { Request, Response, NextFunction } from "express"
import logger from "../utils/logger"
import dotenv from "dotenv"

/**
 * Load environment variables from a .env file.
 */
dotenv.config()

/**
 * If API_KEY is set in env, we require clients to supply it.
 * Otherwise, we allow keyless access.
 */
const apiKey = process.env.API_KEY
const requireApiKey = Boolean(apiKey)

if (requireApiKey) {
  logger.info(
    "API key authentication enabled; all requests must supply a valid key."
  )
} else {
  logger.info("No API_KEY provided; running in keyless mode.")
}

/**
 * API Key authentication middleware.
 */
export function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If no API_KEY was configured, skip auth
  if (!requireApiKey) {
    return next()
  }

  // Otherwise check header or query parameters
  const suppliedKey =
    (req.headers["x-api-key"] as string) ||
    (req.query.api_key as string) ||
    (req.query.API_KEY as string)

  if (suppliedKey === apiKey) {
    return next()
  }

  logger.warn(
    `Unauthorized access attempt from IP=${req.ip}, supplied API key=${suppliedKey}`
  )
  res.status(403).json({ error: "Forbidden: Invalid or missing API key" })
}
