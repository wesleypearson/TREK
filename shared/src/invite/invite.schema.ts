import { z } from 'zod';

/**
 * Guest invite links — request contracts for the public redemption flow and
 * the crew-admin invite management endpoints.
 */

export const guestInviteRegisterRequestSchema = z.object({
  username: z.string().min(1).max(50),
  email: z.string().email().max(254),
  password: z.string().min(8),
  company_name: z.string().max(120).optional(),
});
export type GuestInviteRegisterRequest = z.infer<typeof guestInviteRegisterRequestSchema>;

export const guestInviteCreateRequestSchema = z.object({
  expires_in_days: z.number().int().min(1).max(90).optional(),
});
export type GuestInviteCreateRequest = z.infer<typeof guestInviteCreateRequestSchema>;

export const colleagueInviteRequestSchema = z.object({
  count: z.number().int().min(1).max(10),
});
export type ColleagueInviteRequest = z.infer<typeof colleagueInviteRequestSchema>;

export const guestInviteStageSchema = z.enum([
  'created', 'sent', 'opened', 'registered', 'promoted', 'revoked', 'expired',
]);
export type GuestInviteStageValue = z.infer<typeof guestInviteStageSchema>;
