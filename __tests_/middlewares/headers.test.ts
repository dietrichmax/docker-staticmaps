import { headers } from "../../src/middlewares/headers"
import { Request, Response, NextFunction } from "express"

describe("headers middleware", () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    req = {}

    res = {
      removeHeader: jest.fn(),
      setHeader: jest.fn(),
    }

    next = jest.fn()
  })

  test("removes Server and X-Powered-By headers", () => {
    headers(req as Request, res as Response, next)

    expect(res.removeHeader).toHaveBeenCalledWith("Server")
    expect(res.removeHeader).toHaveBeenCalledWith("X-Powered-By")
  })

  test("sets all security headers", () => {
    headers(req as Request, res as Response, next)

    expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY")
    expect(res.setHeader).toHaveBeenCalledWith(
      "X-XSS-Protection",
      "1; mode=block"
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      "X-Content-Type-Options",
      "nosniff"
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      "Referrer-Policy",
      "no-referrer-when-downgrade"
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()"
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    )
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' * blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';"
    )
  })

  test("calls next once", () => {
    headers(req as Request, res as Response, next)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
