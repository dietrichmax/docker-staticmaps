/**
 * Import necessary modules and utilities.
 */
import express, { Request, Response, NextFunction } from "express"
import dotenv from "dotenv"
import router from "./routes"
import logger from "./utils/logger"
import { authenticateApiKey } from "./middlewares/apiKeyAuth"
import { headers } from "./middlewares/headers"

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

/**
 * Global error handler middleware to catch and log errors, then send a 500 response.
 * @param err - The error object.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @param next - The next middleware function in the stack.
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  logger.error(err)
  res.status(500).json({ error: "Internal server error" })
})

/**
 * Start the Express application and log the URL where it is running.
 */
app.listen(PORT, () => {
  logger.info(
    `🗺️  docker-staticmaps running at http://localhost:${PORT}/staticmaps`
  )
})

/**
 * Export the app instance for further use or testing.
 */
export default app
