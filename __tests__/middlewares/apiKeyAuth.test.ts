import { Request, Response, NextFunction } from "express"

// Mock logger
const mockInfo = jest.fn()
const mockWarn = jest.fn()
const mockError = jest.fn()
jest.mock("../../src/utils/logger", () => ({
  info: mockInfo,
  warn: mockWarn,
  error: mockError,
}))

// Reset modules and clear mocks before each test
beforeEach(() => {
  jest.resetModules()
  jest.clearAllMocks()
})

describe("authenticateApiKey middleware", () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction

  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV }
    req = { headers: {}, query: {}, ip: "127.0.0.1" }
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

    const { authenticateApiKey } = require("../../src/middlewares/apiKeyAuth")
    const AuthConfig = require("../../src/middlewares/authConfig").default

    // call init manually for test to simulate startup
    AuthConfig.init()
    expect(mockInfo).toHaveBeenCalledWith(
      "No API key set - running in keyless mode"
    )

    authenticateApiKey(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
  })

  test("logs API key enabled info if API_KEY is set", () => {
    process.env.API_KEY = "secret123"

    const { authenticateApiKey } = require("../../src/middlewares/apiKeyAuth")
    const AuthConfig = require("../../src/middlewares/authConfig").default

    AuthConfig.init()
    expect(mockInfo).toHaveBeenCalledWith("🔑 API key authentication enabled")

    req.headers = { "x-api-key": "secret123" }
    authenticateApiKey(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
  })

  test("calls next immediately when keyless mode enabled", () => {
    delete process.env.API_KEY

    const { authenticateApiKey } = require("../../src/middlewares/apiKeyAuth")
    const AuthConfig = require("../../src/middlewares/authConfig").default

    AuthConfig.init()
    authenticateApiKey(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
  })

  test("calls next if correct API key provided in header", () => {
    process.env.API_KEY = "secret123"
    const { authenticateApiKey } = require("../../src/middlewares/apiKeyAuth")
    const AuthConfig = require("../../src/middlewares/authConfig").default

    AuthConfig.init()
    req.headers = { "x-api-key": "secret123" }

    authenticateApiKey(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  test("returns 403 and logs warn if wrong API key provided", () => {
    process.env.API_KEY = "secret123"
    const { authenticateApiKey } = require("../../src/middlewares/apiKeyAuth")
    const AuthConfig = require("../../src/middlewares/authConfig").default

    AuthConfig.init()
    req.headers = { "x-api-key": "wrongkey" }

    authenticateApiKey(req as Request, res as Response, next)
    expect(mockWarn).toHaveBeenCalledWith(
      "Unauthorized access from IP=127.0.0.1, API key=[REDACTED]"
    )
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: "Forbidden: Invalid or missing API key",
    })
    expect(next).not.toHaveBeenCalled()
  })
})
