import { z } from 'zod';

export const Step6Schema = z.object({
  employmentHistory: z.array(z.object({
    employer: z.string().min(1, "Employer name is required"),
    position: z.string().min(1, "Position is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })).min(1, "At least one employer is required"),
  // Add other fields for Step 6
});
