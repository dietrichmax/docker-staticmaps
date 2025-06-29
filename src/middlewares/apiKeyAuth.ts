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

/**
 * Extracts the API key from the request headers or query parameters.
 *
 * Checks the following locations in order:
 * - `x-api-key` header
 * - `api_key` query parameter
 * - `API_KEY` query parameter
 *
 * @param {Request} req - Express request object
 * @returns {string | undefined} The extracted API key if present, otherwise undefined.
 */
function extractApiKey(req: Request): string | undefined {
  return (
    req.headers["x-api-key"]?.toString() ||
    req.query.api_key?.toString() ||
    req.query.API_KEY?.toString()
  )
}

/**
 * Middleware to enforce API key authentication for incoming requests.
 *
 * If the environment variable `API_KEY` is set, clients must supply the correct API key
 * via `x-api-key` header, or `api_key` / `API_KEY` query parameters.
 * If `API_KEY` is not set, keyless access is allowed.
 *
 * Logs info about authentication mode on startup,
 * and logs warnings on unauthorized access attempts.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware callback
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

  logger.warn(`Unauthorized access from IP=${req.ip}, API key=${key ?? "none"}`)
  res.status(403).json({ error: "Forbidden: Invalid or missing API key" })
}
