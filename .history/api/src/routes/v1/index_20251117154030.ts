import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  ackAlert,
  listAlerts,
  updateAlertStatus,
} from "../../controllers/alertController.js";
import {
  getAggregatedHistory,
  getDailyAggregates,
  getSensorHistory,
} from "../../controllers/historyController.js";
import {
  createPlant,
  deletePlant,
  getPlant,
  legacyAddPlant,
  listPlants,
  updatePlant,
} from "../../controllers/plantController.js";
import {
  postReading,
  postReadingsBatch,
} from "../../controllers/readingController.js";
import {
  createSensor,
  deleteSensor,
  getSensor,
  listSensorsByPlant,
  updateSensor,
} from "../../controllers/sensorController.js";
import {
  deleteThreshold,
  getThreshold,
  upsertThreshold,
} from "../../controllers/thresholdController.js";
import { validateBody, validateQuery } from "../../middlewares/validate.js";
import { alertListQuery } from "../../schemas/alertSchemas.js";
import {
  historyAggQuery,
  historyDailyQuery,
} from "../../schemas/historySchemas.js";
import {
  legacyCreatePlantSchema,
  plantCreateSchema,
  plantListQuery,
  plantUpdateSchema,
} from "../../schemas/plantSchemas.js";
import {
  readingSchema,
  readingsBatchSchema,
} from "../../schemas/readingSchemas.js";
import {
  sensorCreateSchema,
  sensorListQuery,
  sensorUpdateSchema,
} from "../../schemas/sensorSchemas.js";
import { thresholdUpsertSchema } from "../../schemas/thresholdSchemas.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

// Compatibilidad con simulador existente
router.post(
  "/plants/add",
  validateBody(legacyCreatePlantSchema),
  asyncHandler(legacyAddPlant)
);

// Plantas
router.get("/plants", validateQuery(plantListQuery), asyncHandler(listPlants));
router.post(
  "/plants",
  validateBody(plantCreateSchema),
  asyncHandler(createPlant)
);
router.get("/plants/:id([0-9a-fA-F]{24})", asyncHandler(getPlant));
router.patch(
  "/plants/:id([0-9a-fA-F]{24})",
  validateBody(plantUpdateSchema),
  asyncHandler(updatePlant)
);
router.delete("/plants/:id([0-9a-fA-F]{24})", asyncHandler(deletePlant));

// Sensores
router.get(
  "/plants/:plantId([0-9a-fA-F]{24})/sensors",
  validateQuery(sensorListQuery),
  asyncHandler(listSensorsByPlant)
);
router.post(
  "/plants/:plantId([0-9a-fA-F]{24})/sensors",
  validateBody(sensorCreateSchema),
  asyncHandler(createSensor)
);

// Histórico (Cassandra) - definir ANTES que rutas con :sensorId para evitar colisión con 'history'
router.get("/sensors/history", asyncHandler(getSensorHistory));
router.get(
  "/sensors/history/agg",
  validateQuery(historyAggQuery),
  asyncHandler(getAggregatedHistory)
);
router.get(
  "/sensors/daily",
  validateQuery(historyDailyQuery),
  asyncHandler(getDailyAggregates)
);

// Ingesta de lecturas (Cassandra)
const readingsLimiter = rateLimit({ windowMs: 60_000, max: 120 });
router.post(
  "/readings",
  readingsLimiter,
  validateBody(readingSchema),
  asyncHandler(postReading)
);
router.post(
  "/readings/batch",
  readingsLimiter,
  validateBody(readingsBatchSchema),
  asyncHandler(postReadingsBatch)
);

// Rutas por id de sensor (restringimos a ObjectId para evitar choques)
router.get("/sensors/:sensorId([0-9a-fA-F]{24})", asyncHandler(getSensor));
router.patch(
  "/sensors/:sensorId([0-9a-fA-F]{24})",
  validateBody(sensorUpdateSchema),
  asyncHandler(updateSensor)
);
router.delete(
  "/sensors/:sensorId([0-9a-fA-F]{24})",
  asyncHandler(deleteSensor)
);

// Umbral por sensor
router.get(
  "/sensors/:sensorId([0-9a-fA-F]{24})/threshold",
  asyncHandler(getThreshold)
);
router.put(
  "/sensors/:sensorId([0-9a-fA-F]{24})/threshold",
  validateBody(thresholdUpsertSchema),
  asyncHandler(upsertThreshold)
);
router.delete(
  "/sensors/:sensorId([0-9a-fA-F]{24})/threshold",
  asyncHandler(deleteThreshold)
);

// Alertas
router.get("/alerts", validateQuery(alertListQuery), asyncHandler(listAlerts));
router.patch("/alerts/:id([0-9a-fA-F]{24})/ack", asyncHandler(ackAlert));
router.patch(
  "/alerts/:id([0-9a-fA-F]{24})/status",
  asyncHandler(updateAlertStatus)
);

export default router;
