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
  let AuthConfig: typeof import("../../src/middlewares/authConfig").default
  let authenticateApiKey: typeof import("../../src/middlewares/apiKeyAuth").authenticateApiKey

  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV }
    req = { headers: {}, query: {}, ip: "127.0.0.1" }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    next = jest.fn()

    AuthConfig = require("../../src/middlewares/authConfig").default
    authenticateApiKey =
      require("../../src/middlewares/apiKeyAuth").authenticateApiKey
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  test("keyless mode: next is called if no API_KEY set", () => {
    delete process.env.API_KEY
    AuthConfig.init()

    expect(mockInfo).toHaveBeenCalledWith(
      "No API key set - running in keyless mode"
    )

    authenticateApiKey(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
  })

  test("API key enabled: next is called if correct header provided", () => {
    process.env.API_KEY = "secret123"
    AuthConfig.init()

    expect(mockInfo).toHaveBeenCalledWith("🔑 API key authentication enabled")

    req.headers = { "x-api-key": "secret123" }
    authenticateApiKey(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  test("API key correct in query param api_key", () => {
    process.env.API_KEY = "secret123"
    AuthConfig.init()

    req.query = { api_key: "secret123" }
    authenticateApiKey(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
  })

  test("API key correct in query param API_KEY", () => {
    process.env.API_KEY = "secret123"
    AuthConfig.init()

    req.query = { API_KEY: "secret123" }
    authenticateApiKey(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
  })

  test("API key missing when required returns 403", () => {
    process.env.API_KEY = "secret123"
    AuthConfig.init()

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

  test("wrong API key returns 403 and logs warn", () => {
    process.env.API_KEY = "secret123"
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
