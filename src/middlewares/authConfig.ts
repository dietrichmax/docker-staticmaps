/**
 * @module config/authConfig
 * Handles authentication configuration for the API.
 */

import { Request, Response, NextFunction } from "express"
import logger from "../utils/logger"

/**
 * Authentication configuration class.
 * Reads environment variables once at startup and caches values.
 */
class AuthConfig {
  /** API key value from environment */
  static apiKey?: string

  /** Whether API key authentication is required */
  static requireAuth: boolean = false

  /**
   * Initialize the auth configuration.
   * Logs whether API key authentication is enabled.
   * Should be called once at server startup.
   */
  static init(): void {
    this.apiKey = process.env.API_KEY
    this.requireAuth = Boolean(this.apiKey)

    logger.info(
      this.requireAuth
        ? "🔑 API key authentication enabled"
        : "No API key set - running in keyless mode"
    )
  }

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
  static extractApiKey(req: Request): string | undefined {
    return (
       // API key from header first (preferred)
      req.headers["x-api-key"]?.toString() ||

      // API key from query string (required for docker-staticmaps use case)
      req.query.api_key?.toString() ||
      req.query.API_KEY?.toString()
    )
  }

  /**
   * Middleware to check the demo cookie for /demo-map and similar endpoints.
   * Only allows access if the browser has a valid `demo_auth` cookie.
   */
  static checkDemoCookie(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const cookieHeader = req.headers.cookie
    if (!cookieHeader) {
      res.status(401).send("Unauthorized")
      return
    }

    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, v] = c.trim().split("=")
        return [k, v]
      })
    )

    if (cookies.demo_auth === "true") {
      next()
      return
    }

    res.status(401).send("Unauthorized")
  }
}

export default AuthConfig
