import { Router } from "express"
import staticmapRoutes from "./staticmaps.routes"

const router = Router()

router.use("/staticmaps", staticmapRoutes)

export default router
