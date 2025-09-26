/**
 * Main Express application setup for docker-staticmaps API server.
 *
 * Responsibilities:
 * - Loads environment variables from `.env`.
 * - Configures Express app with logging, security headers, body parsing.
 * - Sets up request logging middleware with IP normalization.
 * - Redirects legacy `/staticmaps` path to `/api/staticmaps`.
 * - Secures API routes with API key authentication middleware.
 * - Serves static assets from `public` directories.
 * - Provides a health check endpoint at `/health`.
 * - Includes a global error handler to catch unhandled exceptions.
 * - Starts the HTTP server on configured port and logs environment settings.
 *
 * @module app
 */

import express, { Request, Response, NextFunction } from "express"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import routes from "./routes/index"
import logger from "./utils/logger"
import { authenticateApiKey } from "./middlewares/apiKeyAuth"
import { headers } from "./middlewares/headers"
import { truncate, normalizeIp } from "./utils/helpers"
import AuthConfig from "./middlewares/authConfig"

// Load environment variables from .env file
dotenv.config()

const app = express()

/**
 * Port to listen on, defaulting to 3000 if not specified via environment.
 * @constant {number}
 */
const PORT = Number(process.env.PORT) || 3000

/**
 * Middleware to log incoming requests, including method, URL (truncated),
 * and normalized client IP address.
 */
app.use((req: Request, _res: Response, next: NextFunction) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown"
  logger.info("Incoming request", {
    method: req.method,
    url: truncate(req.url, 500),
    ip: normalizeIp(ip),
  })
  next()
})

// Initialize authentication
AuthConfig.init()

/**
 * Middleware to apply security headers and other custom headers.
 * Imported from ./middlewares/headers.
 */
app.use(headers)

/**
 * Middleware to parse incoming JSON request bodies.
 */
app.use(express.json())

/**
 * Middleware to parse URL-encoded request bodies (from forms).
 * The 'extended: true' option allows for rich objects and arrays.
 */
app.use(express.urlencoded({ extended: true }))

/**
 * Redirect handler for legacy `/staticmaps` route.
 * Redirects permanently (HTTP 301) to `/api/staticmaps`, preserving query string.
 *
 * @param {Request} req - HTTP request.
 * @param {Response} res - HTTP response.
 */
app.get("/staticmaps", (req, res) => {
  const queryString = req.originalUrl.split("?")[1]
  res.redirect(301, `/api/staticmaps${queryString ? "?" + queryString : ""}`)
})

/**
 * Mount all API routes under `/api` path.
 * Routes are protected by API key authentication middleware.
 */
app.use("/api", authenticateApiKey, routes)

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Middleware to serve static files from local 'public' directory.
 * Logs debug messages when serving static files.
 */
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (_res, filePath) => {
      logger.debug(`Serving static file: ${filePath}`)
    },
  })
)

/**
 * Serve static files also from the parent directory's 'public' folder.
 * Acts as a fallback or legacy static asset directory.
 */
app.use(express.static(path.join(__dirname, "..", "public")))

/**
 * Route handler for root `/` path.
 * Sends the main index.html file from the parent 'public' folder.
 *
 * @param {Request} _req - HTTP request (not used).
 * @param {Response} res - HTTP response.
 */
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"))
})

/**
 * Health check endpoint.
 * Returns JSON with status "ok" and server uptime in seconds.
 *
 * @param {Request} _req - HTTP request (not used).
 * @param {Response} res - HTTP response.
 */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() })
})

/**
 * Global error handling middleware.
 * Logs error details and responds with HTTP 500.
 *
 * @param {Error} err - Error thrown in route handlers or middleware.
 * @param {Request} req - HTTP request.
 * @param {Response} res - HTTP response.
 * @param {NextFunction} _next - Next middleware (not used here).
 */
app.use(
  (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    logger.error("Unhandled error occurred", {
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.url,
      ip: req.ip,
      headers: req.headers,
      params: req.params,
      body: req.method !== "GET" ? req.body : undefined,
    })
    res.status(500).json({ error: "Internal server error" })
  }
)

/**
 * Start HTTP server listening on configured PORT.
 * Logs environment configuration and URLs for usage.
 */
app.listen(PORT, () => {
  logger.info(
    "📦 Environment Configuration:\n" +
      `  PORT: ${PORT}\n` +
      `  ENVIRONMENT: ${process.env.NODE_ENV || "development"}\n` +
      `  TILE_CACHE_TTL: ${process.env.TILE_CACHE_TTL || "3600"}\n` +
      `  TILE_CACHE_DISABLE: ${process.env.TILE_CACHE_DISABLE || "false"}\n` +
      `  TILE_USER_AGENT: ${process.env.TILE_USER_AGENT || "(not set)"}\n` +
      `  API_KEY: ${process.env.API_KEY ? "(set)" : "(not set)"}\n` +
      `  RATE_LIMIT_MS: ${process.env.RATE_LIMIT_MS || "60000"}\n` +
      `  RATE_LIMIT_MAX: ${process.env.RATE_LIMIT_MAX || "60"}\n` +
      `  LOG_LEVEL: ${process.env.LOG_LEVEL || "INFO"}`
  )
  logger.info(
    `🗺️  docker-staticmaps running at http://localhost:${PORT}/api/staticmaps \nDemo running at http://localhost:${PORT}/`
  )
})

export default app
