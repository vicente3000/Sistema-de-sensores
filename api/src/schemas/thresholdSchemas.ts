import { z } from 'zod';

export const thresholdUpsertSchema = z.object({
  min: z.number(),
  max: z.number(),
  hysteresis: z.number().nonnegative().default(0).optional(),
}).refine(v => v.min <= v.max, { message: 'min must be <= max' });

