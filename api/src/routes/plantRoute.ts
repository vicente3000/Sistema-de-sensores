import { Router } from "express";
import { addPlant } from "../controllers/plantController.js";

const router = Router();

router.post("/add", addPlant);

export default router;
