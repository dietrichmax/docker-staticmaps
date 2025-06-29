import { Router, Request, Response, NextFunction } from "express"
import { handleMapRequest } from "../controllers/staticmaps.controller"
import { rateLimiter } from "../utils/rateLimit"
import { MapRequest } from "src/types/types"

/**
 * Custom async handler to wrap asynchronous route handlers.
 *
 * This function ensures that any errors thrown inside the async function
 * are properly caught and passed to Express's error handling middleware via `next()`.
 * It also provides strong typing for `req`, `res`, and `next`.
 *
 * @param {function(MapRequest, Response, NextFunction): Promise<void>} fn - The async function to handle the request.
 * @returns {(req: MapRequest, res: Response, next: NextFunction) => void} Middleware function that executes `fn` and catches errors.
 */
const asyncHandler =
  (fn: (req: MapRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: MapRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }

const router = Router()

/**
 * Router applying rate limiting and handling GET and POST requests at root path.
 */
router.use(rateLimiter)

router.get("/", asyncHandler(handleMapRequest))
router.post("/", asyncHandler(handleMapRequest))

export default router
