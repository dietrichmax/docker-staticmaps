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

    test("calls next() if demo_auth cookie is true", () => {
      req.headers!.cookie = "demo_auth=true"
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

    test("returns 401 if demo_auth cookie is not true", () => {
      req.headers!.cookie = "demo_auth=false"
      AuthConfig.checkDemoCookie(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.send).toHaveBeenCalledWith("Unauthorized")
      expect(next).not.toHaveBeenCalled()
    })

    test("handles multiple cookies and still calls next() when demo_auth=true", () => {
      req.headers!.cookie = "other=123; demo_auth=true; another=456"
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
  })
})
