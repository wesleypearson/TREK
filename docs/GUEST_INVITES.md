# Guest invite links

One-time registration links that convert a temp guest (an accountless
`is_guest` row) into a full account. Everything already recorded for the guest
— splits, payers, settlements, packing/todo assignments, expense tabs — moves
onto the new account in the same transaction (the existing promotion merge).

## Lifecycle (the EDM funnel)

Every stage is timestamped on the `guest_invites` row and mirrored to PostHog:

```
created ──▶ sent ──▶ opened ──▶ registered ──▶ promoted
   │           │        │
   └── revoked / expired (overlay states for live invites)
```

- **created** — a member with `member_manage` generated the link (crew admin →
  guest row → *Generate invite link*). The raw token is shown/copied exactly
  once; only its sha256 hash is stored.
- **sent** — the invite email was accepted by the SMTP transport. Emailing
  **re-issues the link** (hashed-at-rest tokens can't be recovered), so the
  newest email always carries a working link and at most one credential is
  live per guest. 24-hour resend cooldown, lifetime cap of 5 sends — both
  survive re-issues.
- **opened** — first public resolve of the landing page (no tracking pixel;
  email-client blocking makes pixels noise).
- **registered / promoted** — the guest registered on the landing page; the
  promotion merge ran; the funnel keeps the entry via a name snapshot even
  though the guest row is deleted.

The funnel is visible per guest in the crew admin modal, with a bulk
*"Invite all guests with an email"* action (per-guest failure isolation).

## Redemption

`/invite/<token>` is a public, Tour-'95-styled landing page pre-filled from
the guest row. Registration:

- applies the same rules as normal signup (reserved usernames, password
  policy, guest-ignoring uniqueness) and **bypasses the
  `password_registration` toggle** — the invite is the authorization, same as
  admin invite tokens;
- never grants admin and never sets `must_change_password`;
- is double-submit safe (claim-guard: the second concurrent submit gets 404);
- rolls back completely if the promotion fails — no orphan account, the
  invite stays redeemable.

Unknown, revoked and already-redeemed tokens are indistinguishable (404).
Only genuine expiry is distinct (410) so the page can say "ask for a fresh
one". Default TTL 14 days (per-invite override 1–90, never infinite).

## Company loop

Registration captures an optional company. When the Suppliers addon is on,
the company is matched or created in the vendor book (`source: 'invite'`) and
linked on the invite. A registrant whose invite carried a company can then
mint up to 10 **colleague invites** — trip-less links inheriting the company,
whose redemption creates a fresh account (no promotion).

## Operational requirements

- **SMTP** must be configured (Settings → Notifications) for invite email;
  without it, link generation/copying still works and send endpoints return
  a clear 503.
- **`APP_URL`** must be set — emailed links are built from the server's
  canonical URL, never request headers. If it's unset the API response
  carries `localhost_link_warning: true`.
- Invite email content is English-only for now (server-local strings with an
  en fallback, deliberately outside the 22-locale notification machinery);
  the in-app UI is translated in all 22 locales. A full locale pass for the
  email is queued as follow-up work.
- OIDC redemption is out of scope: the landing is password-registration only.

## Endpoints

| Route | Auth | Rate bucket (per 15 min/IP) |
|---|---|---|
| `GET /api/guest-invites/:token` | public | `guest_invite_read` 60 |
| `POST /api/guest-invites/:token/register` | public | `guest_invite_register` 10 |
| `POST /api/guest-invites/colleagues` | JWT | `guest_invite_colleague` 10 |
| `GET /api/trips/:id/guest-invites` | member_manage | — |
| `POST /api/trips/:id/guest-invites/:guestUserId` | member_manage | — |
| `DELETE /api/trips/:id/guest-invites/:guestUserId` | member_manage | — |
| `POST /api/trips/:id/guest-invites/:guestUserId/send` | member_manage | `guest_invite_send` 30 |
| `POST /api/trips/:id/guest-invites/send-all` | member_manage | `guest_invite_send` 30 |

## PostHog events

Server (`distinct_id` = `invite:<id>` pre-registration, `user:<id>` after):
`guest_invite_created`, `guest_invite_sent`, `guest_invite_bulk_sent`,
`guest_invite_opened`, `guest_invite_registered`, `guest_invite_promoted`,
`guest_invite_revoked`, `colleague_invite_created`.

Client: `invite_landing_viewed`, `invite_registration_submitted`,
`invite_registration_completed`, `invite_colleagues_viewed`,
`invite_colleague_links_generated`, `invite_admin_link_created`,
`invite_admin_email_sent`, `invite_admin_bulk_send`, `invite_admin_revoked`.

DB timestamps are the funnel's source of truth; PostHog capture is
production-only telemetry.
