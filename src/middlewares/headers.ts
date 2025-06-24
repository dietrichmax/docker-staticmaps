import { Request, Response, NextFunction } from "express"

/**
 * Middleware to set strong security headers on all responses.
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
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(), fullscreen=(), payment=()",

    // Enforce HTTPS (HSTS)
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",

    // Prevent untrusted cross-origin resource sharing
    "Cross-Origin-Resource-Policy": "same-origin",

    // Strong Content Security Policy
    "Content-Security-Policy": [
      "default-src 'self';",
      "img-src 'self' data: blob: *;",
      "style-src 'self';",
      "script-src 'self';",
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
