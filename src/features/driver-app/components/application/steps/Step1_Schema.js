import { z } from 'zod';

export const Step1Schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  suffix: z.string().optional(),
  'known-by-other-name': z.enum(['yes', 'no']),
  otherName: z.string().optional(),
  ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/, "Invalid SSN format").optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  phone: z.string().regex(/^\D?(\d{3})\D?\D?(\d{3})\D?(\d{4})$/, "Invalid phone number"),
  email: z.string().email("Invalid email address"),
  'sms-consent': z.enum(['yes', 'no']),
  referralSource: z.string().optional(),
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
  'residence-3-years': z.enum(['yes', 'no']),
  previousAddresses: z.array(z.object({
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })).optional(),
});
