import { z } from 'zod';
import { Step1Schema } from './Step1_Schema';
import { Step2Schema } from './Step2_Schema';
import { Step3Schema } from './Step3_Schema';
import { Step4Schema } from './Step4_Schema';
import { Step5Schema } from './Step5_Schema';
import { Step6Schema } from './Step6_Schema';
import { Step7Schema } from './Step7_Schema';
import { Step8Schema } from './Step8_Schema';
import { Step9Schema } from './Step9_Schema';

export const FullApplicationSchema = z.object({
  ...Step1Schema.shape,
  ...Step2Schema.shape,
  ...Step3Schema.shape,
  ...Step4Schema.shape,
  ...Step5Schema.shape,
  ...Step6Schema.shape,
  ...Step7Schema.shape,
  ...Step8Schema.shape,
  ...Step9Schema.shape,
});
