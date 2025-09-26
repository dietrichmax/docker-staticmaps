/**
 * @module middlewares/apiKeyAuth
 * Middleware to enforce API key authentication for incoming requests.
 */

import { Request, Response, NextFunction } from "express"
import logger from "../utils/logger"
import AuthConfig from "./authConfig"

/**
 * Extracts the API key from the request.
 * Checks in order:
 * 1. `x-api-key` header
 * 2. `api_key` query parameter
 * 3. `API_KEY` query parameter
 *
 * @param req Express request object
 * @returns API key if present, otherwise undefined
 */
function extractApiKey(req: Request): string | undefined {
  return (
    req.headers["x-api-key"]?.toString() ||
    req.query.api_key?.toString() ||
    req.query.API_KEY?.toString()
  )
}

/**
 * Express middleware to enforce API key authentication.
 *
 * - If `API_KEY` is set in environment, clients must supply the correct key.
 * - If `API_KEY` is not set, keyless access is allowed.
 *
 * Logs unauthorized access attempts with IP info.
 *
 * @param req Express request object
 * @param res Express response object
 * @param next Next middleware function
 */
export function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!AuthConfig.requireAuth) return next()

  const key = extractApiKey(req)
  if (key === AuthConfig.apiKey) return next()

  logger.warn(`Unauthorized access from IP=${req.ip}, API key=[REDACTED]`)
  res.status(403).json({ error: "Forbidden: Invalid or missing API key" })
}
