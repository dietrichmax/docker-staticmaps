import rateLimit, { MemoryStore } from "express-rate-limit";
import logger from "./logger";

const memoryStore = new MemoryStore();

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // requests per windowMs
  standardHeaders: false,
  legacyHeaders: false,
  store: memoryStore,
  handler: async (req, res) => {
    const ip = req.ip ?? "unknown";

    try {
        const record = await memoryStore.get(ip);
        const currentCount = record?.totalHits ?? 0;
        logger.warn(`Too many requests; IP: ${ip}, Requests: ${currentCount}`);
    } catch (err) {
        logger.error("Error reading rate limit store", { ip, error: err });
    }

    res.status(429).json({ error: "Too many requests, please try again later." });    
  },
});
