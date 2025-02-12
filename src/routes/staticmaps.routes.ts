/**
 * Import necessary modules from Express.
 */
import { Router, Request, Response, NextFunction } from "express"
import { handleMapRequest } from "../controllers/staticmaps.controller.js"

/**
 * Custom async handler to properly type requests and responses.
 * @param fn - The asynchronous function to handle the request.
 * @returns A middleware function that handles errors using next().
 */
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }

/**
 * Create a new Express router instance.
 */
const router = Router()

/**
 * Use the helper function for both GET and POST routes.
 */
router.get("/", asyncHandler(handleMapRequest))
router.post("/", asyncHandler(handleMapRequest))

/**
 * Export the router instance for use in other parts of the application.
 */
export default router
