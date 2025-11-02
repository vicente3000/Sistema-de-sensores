import { Router } from "express";
import { addPlant } from "../controllers/plantController";

const router = Router();

router.post("/add", addPlant);

export default router;
