import { Router } from "express"
import staticmapRoutes from "./staticmaps.routes"

/**
 * Main API router that aggregates all route modules.
 */
const router = Router()

// Mount static maps routes under /staticmaps
router.use("/staticmaps", staticmapRoutes)

export default router
