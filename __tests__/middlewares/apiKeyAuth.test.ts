jest.mock("../../src/utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

import { Request, Response, NextFunction } from "express"

describe("authenticateApiKey middleware", () => {
  const OLD_ENV = process.env

  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...OLD_ENV }

    req = {
      headers: {},
      query: {},
      ip: "127.0.0.1",
    }

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }

    next = jest.fn()
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  test("logs keyless mode info if no API_KEY set", () => {
    delete process.env.API_KEY

    jest.resetModules() // clear module cache

    // import AFTER resetModules
    const logger = require("../../src/utils/logger")
    const { authenticateApiKey } = require("../../src/middlewares/apiKeyAuth")

    // Now the logger.info call happened during import
    expect(logger.info).toHaveBeenCalledWith(
      "No API key set - running in keyless mode"
    )

    // Also test that next() is called since auth is disabled
    authenticateApiKey(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
  })

  test("logs API key enabled info if API_KEY is set", () => {
    process.env.API_KEY = "secret123"

    jest.resetModules()

    const logger = require("../../src/utils/logger")
    const { authenticateApiKey } = require("../../src/middlewares/apiKeyAuth")

    expect(logger.info).toHaveBeenCalledWith(
      "🔑 API key authentication enabled"
    )

    req.headers = { "x-api-key": "secret123" }
    authenticateApiKey(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
  })

  test("calls next immediately when keyless mode enabled", () => {
    delete process.env.API_KEY
    jest.resetModules()
    const { authenticateApiKey } = require("../../src/middlewares/apiKeyAuth")

    authenticateApiKey(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
  })

  test("calls next if correct API key provided in header", () => {
    process.env.API_KEY = "secret123"
    jest.resetModules()
    const { authenticateApiKey } = require("../../src/middlewares/apiKeyAuth")

    req.headers = { "x-api-key": "secret123" }

    authenticateApiKey(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  test("calls next if correct API key provided in query api_key", () => {
    process.env.API_KEY = "secret123"
    jest.resetModules()
    const { authenticateApiKey } = require("../../src/middlewares/apiKeyAuth")

    req.query = { api_key: "secret123" }

    authenticateApiKey(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  test("calls next if correct API key provided in query API_KEY", () => {
    process.env.API_KEY = "secret123"
    jest.resetModules()
    const { authenticateApiKey } = require("../../src/middlewares/apiKeyAuth")

    req.query = { API_KEY: "secret123" }

    authenticateApiKey(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  test("returns 403 and logs warn if no API key provided", () => {
    process.env.API_KEY = "secret123"
    jest.resetModules()

    // import logger AFTER resetModules
    const logger = require("../../src/utils/logger")
    const { authenticateApiKey } = require("../../src/middlewares/apiKeyAuth")

    // no key in headers or query
    authenticateApiKey(req as Request, res as Response, next)

    expect(logger.warn).toHaveBeenCalledWith(
      "Unauthorized access from IP=127.0.0.1, API key=[REDACTED]"
    )
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: "Forbidden: Invalid or missing API key",
    })
    expect(next).not.toHaveBeenCalled()
  })

  test("returns 403 and logs warn if wrong API key provided", () => {
    process.env.API_KEY = "secret123"
    jest.resetModules()

    const logger = require("../../src/utils/logger")
    const { authenticateApiKey } = require("../../src/middlewares/apiKeyAuth")

    req.headers = { "x-api-key": "wrongkey" }

    authenticateApiKey(req as Request, res as Response, next)

    expect(logger.warn).toHaveBeenCalledWith(
      "Unauthorized access from IP=127.0.0.1, API key=[REDACTED]"
    )
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: "Forbidden: Invalid or missing API key",
    })
    expect(next).not.toHaveBeenCalled()
  })
})
