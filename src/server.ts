import express, { Request, Response, NextFunction } from "express"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import routes from "./routes/index"
import logger from "./utils/logger"
import { authenticateApiKey } from "./middlewares/apiKeyAuth"
import { headers } from "./middlewares/headers"
import { truncate, normalizeIp } from "./utils/helpers"

// Load environment variables from a .env file.
dotenv.config()

const app = express()

// Define the port number either from the environment variable or default to 3000.
const PORT = Number(process.env.PORT) || 3000

// Request logging middleware (omits sensitive headers)
app.use((req: Request, _res: Response, next: NextFunction) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown"
  logger.info("Incoming request", {
    method: req.method,
    url: truncate(req.url, 500),
    ip: normalizeIp(ip),
  })
  next()
})

// Apply security and custom headers
app.use(headers)

// Body parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Redirect /staticmaps to /api/staticmaps with query preserved
app.get("/staticmaps", (req, res) => {
  const queryString = req.originalUrl.split("?")[1]
  res.redirect(301, `/api/staticmaps${queryString ? "?" + queryString : ""}`)
})

// API routes secured by API key authentication
app.use("/api", authenticateApiKey, routes)

// Static assets serving
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Serve static files from "public" folder in current directory
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (_res, filePath) => {
      logger.debug(`Serving static file: ${filePath}`)
    },
  })
)

// Also serve static files from parent "public" folder (fallback or legacy?)
app.use(express.static(path.join(__dirname, "..", "public")))

// Serve index.html on root path
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"))
})

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() })
})

// Global error handler
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

// Start server and log URLs
app.listen(PORT, () => {
  logger.info(
    `🗺️${" "} docker-staticmaps running at http://localhost:${PORT}/api/staticmaps \nDemo running at http://localhost:${PORT}/`,
    {
      PORT: PORT,
      ENVIRONMENT: process.env.NODE_ENV || "development",
    }
  )
})

export default app
