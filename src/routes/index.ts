import { Router } from "express"
import staticmapRoutes from "./staticmaps.routes.js"

const router = Router()

router.use("/staticmaps", staticmapRoutes)

export default router
