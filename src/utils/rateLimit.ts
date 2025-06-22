import rateLimit, { MemoryStore } from "express-rate-limit"
import logger from "./logger"
import type { Request, Response } from "express"

// Read from env with fallback defaults
const RATE_LIMIT_MS = parseInt(process.env.RATE_LIMIT_MS || "60000", 10) // default 1 minute
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "60", 10) // default 60 requests

export const memoryStore = new MemoryStore()

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
