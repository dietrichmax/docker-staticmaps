import { Router, Request, Response, NextFunction } from "express"
import { handleMapRequest } from "../controllers/staticmaps.controller"
import { rateLimiter } from "../utils/rateLimit"

/**
 * Define the custom MapRequest type that extends the Express Request type.
 * Use ParsedQs for the query property to match the default Express behavior.
 */
export interface MapRequest extends Request {
  query: { [key: string]: string | string[] | undefined }
}


/**
 * Custom async handler to properly type requests and responses.
 * @param fn - The asynchronous function to handle the request.
 * @returns A middleware function that handles errors using next().
 */
const asyncHandler =
  (fn: (req: MapRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: MapRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }

const router = Router()

router.use(rateLimiter)

router.get("/", asyncHandler(handleMapRequest))
router.post("/", asyncHandler(handleMapRequest))

export default router
