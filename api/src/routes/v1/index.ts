import { Router } from 'express';
import { validateBody, validateQuery } from '../../middlewares/validate.js';
import { plantCreateSchema, plantListQuery, plantUpdateSchema, legacyCreatePlantSchema } from '../../schemas/plantSchemas.js';
import { sensorCreateSchema, sensorUpdateSchema } from '../../schemas/sensorSchemas.js';
import { thresholdUpsertSchema } from '../../schemas/thresholdSchemas.js';
import {
  listPlants, createPlant, getPlant, updatePlant, deletePlant, legacyAddPlant,
} from '../../controllers/plantController.js';
import {
  listSensorsByPlant, createSensor, getSensor, updateSensor, deleteSensor,
} from '../../controllers/sensorController.js';
import { getThreshold, upsertThreshold, deleteThreshold } from '../../controllers/thresholdController.js';
import { listAlerts } from '../../controllers/alertController.js';
import { getSensorHistory } from '../../controllers/historyController.js';
import { postReading, postReadingsBatch } from '../../controllers/readingController.js';
import { readingSchema, readingsBatchSchema } from '../../schemas/readingSchemas.js';

const router = Router();

// Compatibilidad con simulador existente
router.post('/plants/add', validateBody(legacyCreatePlantSchema), legacyAddPlant);

// Plantas
router.get('/plants', validateQuery(plantListQuery), listPlants);
router.post('/plants', validateBody(plantCreateSchema), createPlant);
router.get('/plants/:id', getPlant);
router.patch('/plants/:id', validateBody(plantUpdateSchema), updatePlant);
router.delete('/plants/:id', deletePlant);

// Sensores
router.get('/plants/:plantId/sensors', listSensorsByPlant);
router.post('/plants/:plantId/sensors', validateBody(sensorCreateSchema), createSensor);

// Histórico (Cassandra) - definir ANTES que rutas con :sensorId para evitar colisión con 'history'
router.get('/sensors/history', getSensorHistory);

// Ingesta de lecturas (Cassandra)
router.post('/readings', validateBody(readingSchema), postReading);
router.post('/readings/batch', validateBody(readingsBatchSchema), postReadingsBatch);

// Rutas por id de sensor (restringimos a ObjectId para evitar choques)
router.get('/sensors/:sensorId([0-9a-fA-F]{24})', getSensor);
router.patch('/sensors/:sensorId([0-9a-fA-F]{24})', validateBody(sensorUpdateSchema), updateSensor);
router.delete('/sensors/:sensorId([0-9a-fA-F]{24})', deleteSensor);

// Umbral por sensor
router.get('/sensors/:sensorId/threshold', getThreshold);
router.put('/sensors/:sensorId/threshold', validateBody(thresholdUpsertSchema), upsertThreshold);
router.delete('/sensors/:sensorId/threshold', deleteThreshold);

// Alertas
router.get('/alerts', listAlerts);

export default router;
