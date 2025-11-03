import { Router } from "express";
import { legacyAddPlant } from "../controllers/plantController.js";
const router = Router();
// Ruta legada conservada para compatibilidad en tests y simulador local
router.post("/add", legacyAddPlant);
export default router;
