import { Request, Response, NextFunction } from "express"

/**
 * Custom middleware function to set headers in responses.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The next middleware function in the stack.
 */
export function headers(req: Request, res: Response, next: NextFunction): void {
  const securityHeaders: { [key: string]: string } = {
    "X-Frame-Options": "DENY", // Prevent clickjacking
    "X-XSS-Protection": "1; mode=block", // Enable XSS protection
    "X-Content-Type-Options": "nosniff", // Prevent MIME sniffing
    "Referrer-Policy": "no-referrer-when-downgrade", // Limit referrer information
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()", // Disable certain browser features
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload", // Enforce HTTPS
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; img-src 'self' data:;",
  }

  for (const [key, value] of Object.entries(securityHeaders)) {
    res.setHeader(key, value)
    res.removeHeader("Server")
  }

  next()
}
