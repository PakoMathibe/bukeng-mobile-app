// lib/validators.ts
import { z } from 'zod';
import { CONSTANTS } from './constants';

export const loginSchema = z.object({
  email: z
    .string()
    .regex(CONSTANTS.VALIDATION.EMAIL_REGEX, 'Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name too long'),
    email: z
      .string()
      .regex(CONSTANTS.VALIDATION.EMAIL_REGEX, 'Invalid email address'),
    phoneNumber: z
      .string()
      .regex(
        CONSTANTS.VALIDATION.PHONE_REGEX,
        'Invalid South African phone number'
      ),
    idNumber: z
      .string()
      .length(CONSTANTS.VALIDATION.ID_LENGTH, 'ID number must be 13 digits'),
    password: z
      .string()
      .min(
        CONSTANTS.VALIDATION.PASSWORD_MIN_LENGTH,
        'Password must be at least 8 characters'
      )
      .max(CONSTANTS.VALIDATION.PASSWORD_MAX_LENGTH, 'Password too long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const idVerificationSchema = z.object({
  idNumber: z
    .string()
    .length(CONSTANTS.VALIDATION.ID_LENGTH, 'ID number must be 13 digits'),
});

export const phoneVerificationSchema = z.object({
  phoneNumber: z
    .string()
    .regex(
      CONSTANTS.VALIDATION.PHONE_REGEX,
      'Invalid South African phone number'
    ),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export const orderSchema = z.object({
  merchantId: z.string().uuid('Invalid merchant ID'),
  amount: z
    .number()
    .min(10, 'Minimum order amount is R10')
    .max(5000, 'Maximum order amount is R5000'),
});

export const repaymentSchema = z.object({
  instalmentId: z.string().uuid('Invalid instalment ID'),
  amount: z.number().positive('Amount must be positive'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type IDVerificationInput = z.infer<typeof idVerificationSchema>;
export type PhoneVerificationInput = z.infer<typeof phoneVerificationSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type RepaymentInput = z.infer<typeof repaymentSchema>;
