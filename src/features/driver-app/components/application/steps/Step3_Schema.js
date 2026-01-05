import { z } from 'zod';

export const Step3Schema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  licenseState: z.string().min(1, "License state is required"),
  // Add other fields for Step 3
});
