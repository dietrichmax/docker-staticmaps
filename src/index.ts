/**
 * Import necessary modules and utilities.
 */
import express, { Request, Response, NextFunction } from "express"
import dotenv from "dotenv"
import router from "./routes.js"
import logger from "./utils/logger.js"
import { authenticateApiKey } from "./middlewares/apiKeyAuth.js"
import { headers } from "./middlewares/headers.js"
import path from "path"
import { fileURLToPath } from "url"

/**
 * Load environment variables from a .env file.
 */
dotenv.config()

/**
 * Create an instance of the Express application.
 */
const app = express()

/**
 * Define the port number either from the environment variable or default to 3000.
 */
const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

/**
 * Middleware to log incoming requests.
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const { authorization, cookie, ...safeHeaders } = req.headers // Remove sensitive headers
  const logHeaders = process.env.NODE_ENV === "development"

  logger.info("Incoming request", {
    method: req.method,
    url: req.url,
    ip: req.ip,
    headers: logHeaders ? req.headers : safeHeaders,
    params: req.params,
    body: req.method !== "GET" ? req.body : undefined, // Log body only for non-GET requests
  })
  next()
})

/**
 * Apply the custom headers middleware to all incoming requests.
 */
app.use(headers)

/**
 * Middleware to parse JSON request bodies.
 */
app.use(express.json())

/**
 * Middleware to parse URL-encoded request bodies.
 */
app.use(express.urlencoded({ extended: true }))

/**
 * Use the authenticateApiKey middleware to secure the /staticmaps route.
 * Only requests with a valid API key will be allowed to access it.
 */
app.use("/staticmaps", authenticateApiKey, router)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
console.log(__filename)
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, path) => {
      logger.debug(`Serving: ${path}`) // Debug log
    },
  })
)

// Correct path to public folder
app.use(express.static(path.join(__dirname, "..", "public")))

// Serve index.html on root "/"
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"))
})

/**
 * Health check endpoint to verify service availability.
 */
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() })
})

/**
 * Global error handler middleware to catch and log errors, then send a 500 response.
 * @param err - The error object.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The next middleware function in the stack.
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
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
})

/**
 * Start the Express application and log the URL where it is running.
 */
app.listen(PORT, () => {
  logger.info(
    `🗺️  docker-staticmaps running at http://localhost:${PORT}/staticmaps`,
    {
      port: PORT,
      environment: process.env.NODE_ENV || "development",
    }
  )
})
/**
 * Export the app instance for further use or testing.
 */
export default app
