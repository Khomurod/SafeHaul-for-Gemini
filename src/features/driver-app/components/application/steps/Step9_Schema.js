import { z } from 'zod';

export const Step9Schema = z.object({
  signature: z.string().min(1, "Signature is required"),
  'final-certification': z.boolean().refine(val => val === true, {
    message: "You must certify the application",
  }),
});
