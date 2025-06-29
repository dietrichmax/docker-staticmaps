import { rateLimiterConfig, memoryStore } from "../../src/utils/rateLimit"
import logger from "../../src/utils/logger"

describe("rateLimiter", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("uses default rate limit values if env vars are missing", () => {
    expect(rateLimiterConfig.windowMs).toBe(60000)
    expect(rateLimiterConfig.max).toBe(60)
  })

  it("uses env rate limit values if set", () => {
    process.env.RATE_LIMIT_MS = "120000"
    process.env.RATE_LIMIT_MAX = "100"
    // To apply env vars, re-import or re-create config in a separate module or mock require
    // For demo, assume we re-import after setting env vars
    jest.resetModules()
    const { rateLimiterConfig: config } = require("../../src/utils/rateLimit")
    expect(config.windowMs).toBe(120000)
    expect(config.max).toBe(100)
  })

  it("handler logs warning and responds 429 on too many requests", async () => {
    const req: any = { ip: "1.2.3.4" }
    const status = jest.fn().mockReturnThis()
    const json = jest.fn()
    const res: any = { status, json }

    jest.spyOn(memoryStore, "get").mockResolvedValue({
      totalHits: 42,
      resetTime: new Date(Date.now() + 60000), // a Date object 1 minute from now
    })

    const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => {})

    await rateLimiterConfig.handler(req, res)

    expect(memoryStore.get).toHaveBeenCalledWith("1.2.3.4")
    expect(warnSpy).toHaveBeenCalledWith(
      "Too many requests; IP: 1.2.3.4, Requests: 42"
    )
    expect(status).toHaveBeenCalledWith(429)
    expect(json).toHaveBeenCalledWith({
      error: "Too many requests, please try again later.",
    })
  })

  it("handler logs error if memoryStore.get throws", async () => {
    const req: any = { ip: "1.2.3.4" }
    const status = jest.fn().mockReturnThis()
    const json = jest.fn()
    const res: any = { status, json }
    const error = new Error("Failed to read store")

    jest.spyOn(memoryStore, "get").mockRejectedValue(error)
    const errorSpy = jest.spyOn(logger, "error").mockImplementation(() => {})

    await rateLimiterConfig.handler(req, res)

    expect(errorSpy).toHaveBeenCalledWith("Error reading rate limit store", {
      ip: "1.2.3.4",
      error,
    })
    expect(status).toHaveBeenCalledWith(429)
    expect(json).toHaveBeenCalledWith({
      error: "Too many requests, please try again later.",
    })
  })

  it("handler defaults to unknown IP if none provided", async () => {
    const req: any = {}
    const status = jest.fn().mockReturnThis()
    const json = jest.fn()
    const res: any = { status, json }

    jest.spyOn(memoryStore, "get").mockResolvedValue({
      totalHits: 5,
      resetTime: new Date(Date.now() + 60000), // a Date object 1 minute from now
    })

    const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => {})

    await rateLimiterConfig.handler(req, res)

    expect(memoryStore.get).toHaveBeenCalledWith("unknown")
    expect(warnSpy).toHaveBeenCalledWith(
      "Too many requests; IP: unknown, Requests: 5"
    )
    expect(status).toHaveBeenCalledWith(429)
    expect(json).toHaveBeenCalledWith({
      error: "Too many requests, please try again later.",
    })
  })

  it("logs 0 requests if memoryStore.get returns undefined", async () => {
    const req: any = { ip: "2.3.4.5" }
    const status = jest.fn().mockReturnThis()
    const json = jest.fn()
    const res: any = { status, json }

    jest.spyOn(memoryStore, "get").mockResolvedValue(undefined)
    const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => {})

    await rateLimiterConfig.handler(req, res)

    expect(memoryStore.get).toHaveBeenCalledWith("2.3.4.5")
    expect(warnSpy).toHaveBeenCalledWith(
      "Too many requests; IP: 2.3.4.5, Requests: 0"
    )
    expect(status).toHaveBeenCalledWith(429)
    expect(json).toHaveBeenCalledWith({
      error: "Too many requests, please try again later.",
    })
  })
})
