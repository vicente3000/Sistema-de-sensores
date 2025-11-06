import { z } from 'zod';

export const sensorTypes = ['humidity','ph','temp','lux'] as const;

export const sensorCreateSchema = z.object({
  type: z.enum(sensorTypes),
  unit: z.string().trim().optional(),
  meta: z.record(z.any()).optional(),
});

export const sensorUpdateSchema = z.object({
  type: z.enum(sensorTypes).optional(),
  unit: z.string().trim().optional(),
  meta: z.record(z.any()).optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'Empty body' });

export const sensorListQuery = z.object({
  type: z.enum(sensorTypes).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
