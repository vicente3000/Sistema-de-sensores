import { z } from 'zod';

export const alertListQuery = z.object({
  plantId: z.string().trim().optional(),
  sensorId: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  level: z.enum(['normal','grave','critica']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

