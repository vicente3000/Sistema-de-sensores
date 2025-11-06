import { z } from 'zod';

export const plantCreateSchema = z.object({
  name: z.string().min(1),
  type: z.string().trim().min(1).optional(),
});

export const plantUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().trim().min(1).optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'Empty body' });

export const plantListQuery = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// Compatibilidad para /plants/add (legado)
export const legacyCreatePlantSchema = z.object({
  plant: plantCreateSchema,
  sensors: z.array(z.object({
    id: z.string(),
    type: z.enum(['humidity','ph','temp','lux']),
    thresholdMin: z.number().optional(),
    thresholdMax: z.number().optional(),
    scheduleMode: z.enum(['predefinida','horario','rango']),
    everyHours: z.number().int().positive().optional(),
    fixedTimes: z.string().optional(),
    rangeStart: z.string().optional(),
    rangeEnd: z.string().optional(),
    rangeCount: z.number().int().positive().optional(),
  })).default([]),
});

