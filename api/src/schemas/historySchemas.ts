import { z } from 'zod';

export const historyAggQuery = z.object({
  plant: z.string().min(1),
  sensor: z.enum(['humidity','ph','temp','lux']),
  from: z.string().optional(),
  to: z.string().optional(),
  step: z.enum(['1m','5m','1h']).default('1m'),
});

export const historyDailyQuery = z.object({
  plant: z.string().min(1),
  sensor: z.enum(['humidity','ph','temp','lux']),
  from: z.string().optional(),
  to: z.string().optional(),
});

