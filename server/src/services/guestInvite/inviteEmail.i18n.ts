/**
 * Invite email strings — server-local and en-only for now, with an en
 * fallback for every locale. Deliberately NOT a CoreNotificationEventKey:
 * that would force edits to all 22 locale files + the parity gate in the
 * same change. The 21-locale pass is a scheduled follow-up (see docs).
 *
 * {tokens}: inviter, trip, date, company.
 */

export interface InviteEmailStrings {
  /** Subject (sendEmail prefixes "Travla — " itself). */
  subject: (p: { inviter: string; trip: string }) => string;
  colleagueSubject: (p: { company: string }) => string;
  greeting: (p: { name: string }) => string;
  body: (p: { inviter: string; trip: string }) => string;
  colleagueBody: (p: { company: string }) => string;
  ctaHint: string;
  expiry: (p: { date: string }) => string;
  ignore: string;
}

const en: InviteEmailStrings = {
  subject: (p) => `${p.inviter} invited you to ${p.trip}`,
  colleagueSubject: (p) => `You're invited to join ${p.company} on Travla`,
  greeting: (p) => `Hi ${p.name},`,
  body: (p) =>
    `${p.inviter} has been tracking your share of the costs on "${p.trip}" and invited you to claim your own Travla account. ` +
    `Everything already recorded for you — splits, payments, settlements and tabs — moves onto your account the moment you register.`,
  colleagueBody: (p) =>
    `A colleague at ${p.company} invited you to join them on Travla, the platform their production uses to run events, crew and costs.`,
  ctaHint: 'Use the button below to claim your account. The link works exactly once.',
  expiry: (p) => `This link expires on ${p.date} and can be used once.`,
  ignore: "If you weren't expecting this, you can safely ignore this email.",
};

const INVITE_EMAIL_I18N: Record<string, InviteEmailStrings> = { en };

export function getInviteEmailText(lang: string): InviteEmailStrings {
  return INVITE_EMAIL_I18N[lang] ?? en;
}
