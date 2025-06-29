import rateLimit, { MemoryStore } from "express-rate-limit"
import logger from "./logger"
import type { Request, Response } from "express"


/**
 * Rate limit window duration in milliseconds.
 * Read from environment variable RATE_LIMIT_MS or defaults to 60000 (1 minute).
 */
const RATE_LIMIT_MS = parseInt(process.env.RATE_LIMIT_MS || "60000", 10)

/**
 * Maximum allowed requests per window per IP.
 * Read from environment variable RATE_LIMIT_MAX or defaults to 60.
 */
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "60", 10)

/**
 * In-memory store for tracking rate limit data.
 * Shared by the rate limiter middleware.
 */
export const memoryStore = new MemoryStore()

/**
 * Configuration object for the Express rate limiter middleware.
 * - windowMs: Time frame for rate limiting (in milliseconds).
 * - max: Maximum number of requests allowed per IP per window.
 * - standardHeaders: Disable sending standardized rate limit headers.
 * - legacyHeaders: Disable sending legacy rate limit headers.
 * - store: MemoryStore instance to keep track of IP request counts.
 * - handler: Custom handler function called when the rate limit is exceeded.
 *   Logs a warning with the IP and request count,
 *   then sends HTTP 429 response with a JSON error message.
 */
export const rateLimiterConfig = {
  windowMs: RATE_LIMIT_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: false,
  legacyHeaders: false,
  store: memoryStore,
  handler: async (req: Request, res: Response) => {
    const ip = req.ip ?? "unknown"

    try {
      const record = await memoryStore.get(ip)
      const currentCount = record?.totalHits ?? 0
      logger.warn(`Too many requests; IP: ${ip}, Requests: ${currentCount}`)
    } catch (err) {
      logger.error("Error reading rate limit store", { ip, error: err })
    }
    res
      .status(429)
      .json({ error: "Too many requests, please try again later." })
  },
}

export const rateLimiter = rateLimit(rateLimiterConfig)
