import { z } from 'zod';

export const Step2Schema = z.object({
  experience: z.array(z.string()).min(1, "At least one type of experience is required"),
  // Add other fields for Step 2
});
