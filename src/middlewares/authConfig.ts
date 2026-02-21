/**
 * @module config/authConfig
 * Handles authentication configuration for the API.
 */

import { Request, Response, NextFunction } from "express"
import crypto from "crypto"
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

  /** Secret for HMAC-signing demo cookies. Random per process if not set. */
  private static demoCookieSecret: string =
    process.env.DEMO_COOKIE_SECRET || crypto.randomBytes(32).toString("hex")

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

  /** Creates an HMAC-signed demo cookie value with a 30-minute expiry. */
  static signDemoCookie(): string {
    const expires = Date.now() + 30 * 60 * 1000
    const payload = `demo:${expires}`
    const sig = crypto
      .createHmac("sha256", this.demoCookieSecret)
      .update(payload)
      .digest("hex")
    return `${payload}.${sig}`
  }

  /** Verifies an HMAC-signed demo cookie value. Returns true if valid and not expired. */
  static verifyDemoCookie(value: string): boolean {
    const lastDot = value.lastIndexOf(".")
    if (lastDot === -1) return false
    const payload = value.slice(0, lastDot)
    const sig = value.slice(lastDot + 1)
    const expected = crypto
      .createHmac("sha256", this.demoCookieSecret)
      .update(payload)
      .digest("hex")
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
      return false
    const parts = payload.split(":")
    if (parts.length !== 2 || parts[0] !== "demo") return false
    const expires = parseInt(parts[1], 10)
    return Date.now() < expires
  }

  /**
   * Middleware to check the demo cookie for /demo-map and similar endpoints.
   * Only allows access if the browser has a valid HMAC-signed `demo_auth` cookie.
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
        const idx = c.indexOf("=")
        if (idx === -1) return [c.trim(), ""]
        return [c.slice(0, idx).trim(), c.slice(idx + 1).trim()]
      })
    )

    if (cookies.demo_auth && AuthConfig.verifyDemoCookie(cookies.demo_auth)) {
      next()
      return
    }

    res.status(401).send("Unauthorized")
  }
}

export default AuthConfig
