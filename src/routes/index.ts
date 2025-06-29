import { Router } from "express"
import staticmapRoutes from "./staticmaps.routes"


/**
 * Main API router that aggregates all route modules.
 *
 * This router serves as the central routing hub, mounting
 * individual feature routers under their respective paths.
 * 
 * Currently mounted routes:
 * - `/staticmaps` for static maps related endpoints.
 * 
 * Additional route modules can be mounted here as the API expands.
 */
const router = Router()

// Mount static maps routes under /staticmaps
router.use("/staticmaps", staticmapRoutes)

export default router
