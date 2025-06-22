import { Request, Response, NextFunction } from "express"

/**
 * Middleware to set common security headers on all responses.
 */
export function headers(req: Request, res: Response, next: NextFunction): void {
  // Define security headers once
  const securityHeaders: Record<string, string> = {
    "X-Frame-Options": "DENY", // Prevent clickjacking
    "X-XSS-Protection": "1; mode=block", // Enable XSS protection
    "X-Content-Type-Options": "nosniff", // Prevent MIME sniffing
    "Referrer-Policy": "no-referrer-when-downgrade", // Limit referrer info
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()", // Disable features
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload", // Enforce HTTPS
    "Content-Security-Policy":
      "default-src 'self'; img-src 'self' * blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';",
  }

  // Remove the Server header before setting others (only once)
  res.removeHeader("Server")
  res.removeHeader("X-Powered-By")

  // Set all security headers
  for (const [key, value] of Object.entries(securityHeaders)) {
    res.setHeader(key, value)
  }

  next()
}
