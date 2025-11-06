import { z } from 'zod';
import { sensorTypes } from './sensorSchemas.js';

export const readingSchema = z.object({
  plant: z.string().min(1),
  sensorType: z.enum(sensorTypes),
  sensorId: z.string().min(1),
  value: z.number(),
  ts: z.union([z.string(), z.number()]).optional(), // ISO o epoch ms/seg
});

export const readingsBatchSchema = z.object({
  readings: z.array(readingSchema).min(1),
});

export type ReadingInput = z.infer<typeof readingSchema>;

