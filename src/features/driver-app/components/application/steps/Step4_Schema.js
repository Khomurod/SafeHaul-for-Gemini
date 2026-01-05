import { z } from 'zod';

export const Step4Schema = z.object({
  violations: z.array(z.object({
    date: z.string().min(1, "Date is required"),
    location: z.string().min(1, "Location is required"),
    description: z.string().min(1, "Description is required"),
  })).optional(),
  // Add other fields for Step 4
});
