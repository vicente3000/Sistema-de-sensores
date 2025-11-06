import { Router } from "express";
import { legacyAddPlant } from "../controllers/plantController.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const router = Router();
// Ruta legada conservada para compatibilidad en tests y simulador local
router.post("/add", asyncHandler(legacyAddPlant));
export default router;
