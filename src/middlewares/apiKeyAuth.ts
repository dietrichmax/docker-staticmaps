import { Request, Response, NextFunction } from "express"
import logger from "../utils/logger"

/**
 * If API_KEY is set in env, we require clients to supply it.
 * Otherwise, we allow keyless access.
 */

const API_KEY = process.env.API_KEY
const REQUIRE_AUTH = Boolean(API_KEY)

if (REQUIRE_AUTH) {
  logger.info("🔑 API key authentication enabled")
} else {
  logger.info("No API key set - running in keyless mode")
}

function extractApiKey(req: Request): string | undefined {
  return (
    req.headers["x-api-key"]?.toString() ||
    req.query.api_key?.toString() ||
    req.query.API_KEY?.toString()
  )
}

/**
 * Express middleware to enforce API key authentication if required.
 */
export function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!REQUIRE_AUTH) return next()

  const key = extractApiKey(req)

  if (key === API_KEY) {
    return next()
  }

  logger.warn(
    `Unauthorized access from IP=${req.ip}, API key=${key ?? "none"}`
  )
  res.status(403).json({ error: "Forbidden: Invalid or missing API key" })
}