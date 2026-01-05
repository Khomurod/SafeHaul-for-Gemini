import { z } from 'zod';

export const Step7Schema = z.object({
  additionalQuestions: z.object({
    question1: z.string().optional(),
    question2: z.string().optional(),
    // Add other fields for Step 7
  }),
});
