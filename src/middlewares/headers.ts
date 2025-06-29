import { Request, Response, NextFunction } from "express"

/**
 * Express middleware to set strong HTTP security headers on all responses.
 *
 * This middleware enhances security by setting headers that:
 * - Prevent clickjacking via X-Frame-Options
 * - Disable MIME type sniffing via X-Content-Type-Options
 * - Control referrer information with Referrer-Policy
 * - Restrict browser feature usage with Permissions-Policy
 * - Enforce HTTPS with Strict-Transport-Security (HSTS)
 * - Restrict cross-origin resource sharing with Cross-Origin-Resource-Policy
 * - Implement a strict Content Security Policy (CSP)
 * 
 * Additionally, it removes the `Server` and `X-Powered-By` headers
 * to minimize information disclosure about the backend server.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function in the chain.
 */
export function headers(req: Request, res: Response, next: NextFunction): void {
  const securityHeaders: Record<string, string> = {
    // Prevent clickjacking
    "X-Frame-Options": "DENY",

    // Prevent MIME sniffing
    "X-Content-Type-Options": "nosniff",

    // Control referrer information
    "Referrer-Policy": "no-referrer-when-downgrade",

    // Restrict browser feature access
    "Permissions-Policy":
      "geolocation=(), microphone=(), camera=(), fullscreen=(), payment=()",

    // Enforce HTTPS (HSTS)
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",

    // Prevent untrusted cross-origin resource sharing
    "Cross-Origin-Resource-Policy": "same-origin",

    // Strong Content Security Policy
    "Content-Security-Policy": [
      "default-src 'self';",
      "img-src 'self' data: blob: *;",
      "style-src 'self' 'unsafe-inline';",
      "script-src 'self' 'unsafe-inline';",
      "connect-src 'self';",
      "font-src 'self' data:;",
      "object-src 'none';",
      "frame-ancestors 'none';",
    ].join(" "),
  }

  // Remove server-identifying headers
  res.removeHeader("Server")
  res.removeHeader("X-Powered-By")

  // Apply headers
  for (const [key, value] of Object.entries(securityHeaders)) {
    res.setHeader(key, value)
  }

  next()
}
