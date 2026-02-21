import { Request, Response, NextFunction } from "express"

// Mock logger
const mockInfo = jest.fn()
jest.mock("../../src/utils/logger", () => ({
  info: mockInfo,
}))

// Reset modules and clear mocks before each test
beforeEach(() => {
  jest.resetModules()
  jest.clearAllMocks()
})

describe("AuthConfig", () => {
  let AuthConfig: typeof import("../../src/middlewares/authConfig").default
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV }
    AuthConfig = require("../../src/middlewares/authConfig").default
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  describe("init()", () => {
    test("sets requireAuth to false when no API_KEY", () => {
      delete process.env.API_KEY
      AuthConfig.init()

      expect(AuthConfig.apiKey).toBeUndefined()
      expect(AuthConfig.requireAuth).toBe(false)
      expect(mockInfo).toHaveBeenCalledWith(
        "No API key set - running in keyless mode"
      )
    })

    test("sets requireAuth to true when API_KEY is set", () => {
      process.env.API_KEY = "secret123"
      AuthConfig.init()

      expect(AuthConfig.apiKey).toBe("secret123")
      expect(AuthConfig.requireAuth).toBe(true)
      expect(mockInfo).toHaveBeenCalledWith("🔑 API key authentication enabled")
    })
  })

  describe("extractApiKey()", () => {
    beforeEach(() => {
      AuthConfig.init()
    })

    test("extracts key from x-api-key header", () => {
      const req = {
        headers: { "x-api-key": "headerkey" },
        query: {},
      } as unknown as Request
      expect(AuthConfig.extractApiKey(req)).toBe("headerkey")
    })

    test("extracts key from query param api_key", () => {
      const req = {
        headers: {},
        query: { api_key: "querykey" },
      } as unknown as Request
      expect(AuthConfig.extractApiKey(req)).toBe("querykey")
    })

    test("extracts key from query param API_KEY", () => {
      const req = {
        headers: {},
        query: { API_KEY: "queryKEY" },
      } as unknown as Request
      expect(AuthConfig.extractApiKey(req)).toBe("queryKEY")
    })

    test("returns undefined if no key present", () => {
      const req = { headers: {}, query: {} } as Request
      expect(AuthConfig.extractApiKey(req)).toBeUndefined()
    })
  })

  describe("checkDemoCookie()", () => {
    let req: Partial<Request>
    let res: Partial<Response>
    let next: NextFunction

    beforeEach(() => {
      req = { headers: {} }
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      }
      next = jest.fn()
    })

    test("calls next() if demo_auth cookie is valid signed value", () => {
      const signed = AuthConfig.signDemoCookie()
      req.headers!.cookie = `demo_auth=${signed}`
      AuthConfig.checkDemoCookie(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    test("returns 401 if no cookie header present", () => {
      AuthConfig.checkDemoCookie(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.send).toHaveBeenCalledWith("Unauthorized")
      expect(next).not.toHaveBeenCalled()
    })

    test("returns 401 if demo_auth cookie is invalid", () => {
      req.headers!.cookie = "demo_auth=forged_value"
      AuthConfig.checkDemoCookie(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.send).toHaveBeenCalledWith("Unauthorized")
      expect(next).not.toHaveBeenCalled()
    })

    test("handles multiple cookies and still calls next() when demo_auth is valid", () => {
      const signed = AuthConfig.signDemoCookie()
      req.headers!.cookie = `other=123; demo_auth=${signed}; another=456`
      AuthConfig.checkDemoCookie(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    test("handles multiple cookies and blocks when demo_auth not present", () => {
      req.headers!.cookie = "other=123; another=456"
      AuthConfig.checkDemoCookie(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.send).toHaveBeenCalledWith("Unauthorized")
      expect(next).not.toHaveBeenCalled()
    })

    test("rejects expired demo cookie", () => {
      // Craft a cookie with an expiry 1 hour in the past
      const crypto = require("crypto")
      const expiredTime = Date.now() - 60 * 60 * 1000
      const payload = `demo:${expiredTime}`
      // Sign it with the same secret (random per process, but AuthConfig uses it internally)
      // We use signDemoCookie then manually tamper with the expiry to simulate expiration
      const validCookie = AuthConfig.signDemoCookie()
      // Extract the secret by re-signing: we can't access the secret directly,
      // so instead we use Date.now mock to simulate time passing
      const originalNow = Date.now
      Date.now = () => originalNow() + 31 * 60 * 1000 // 31 minutes later (past 30-min expiry)
      req.headers!.cookie = `demo_auth=${validCookie}`
      AuthConfig.checkDemoCookie(req as Request, res as Response, next)
      Date.now = originalNow
      expect(res.status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })
  })
})
