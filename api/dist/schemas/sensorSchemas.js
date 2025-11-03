import { z } from 'zod';
export const sensorTypes = ['humidity', 'ph', 'temp', 'lux'];
export const sensorCreateSchema = z.object({
    type: z.enum(sensorTypes),
    unit: z.string().trim().optional(),
});
export const sensorUpdateSchema = z.object({
    type: z.enum(sensorTypes).optional(),
    unit: z.string().trim().optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'Empty body' });
