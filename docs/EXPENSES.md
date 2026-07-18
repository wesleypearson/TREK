# Expenses — group/personal splitting, receipt scanning, public tabs (Travla custom)

Travla extends TREK's budget ledger with four things: personal expenses,
scanned receipts, AI line-item extraction, and public expense tabs. Everything
else (multi-payer, equal/custom splits, settlement, "who owes whom" flows) is
stock TREK.

## Group vs personal expenses

Every expense is a **group** expense by default: all trip members see it and it
counts toward the group settlement. Ticking **"Personal expense (only me)"**
makes it yours alone — other members never see it (the API returns 404, not
403, so its existence isn't revealed), it is excluded from the settlement and
per-person math, and its live-update events reach only your own devices. Only
the creator can flip an expense between personal and group.

A personal expense is **never split**: the payer and split editors disappear
from the modal (just a name, amount, category, date and optional receipt) and
the record is lodged as your own spend — self-paid in full, owed by no one, so
it never shows as "unfinished" and never touches anyone's balance. This is
enforced server-side too: whatever a client sends, a personal expense's only
payer and only member is its owner, and flipping a shared expense to personal
detaches everyone else that was on it.

## Line-item splitting (the John/Lisa/Martin rule)

The expense modal's **itemized (ticket) split** assigns each receipt line to
one or more people; each line divides equally among exactly the people
assigned to it. The person who *pays* is not part of a line's split unless
they assign themselves: if John pays and assigns a line to Lisa and Martin,
they owe 50/50 and John owes nothing for that line. Per-person totals feed the
standard settlement engine, so recorded payments and simplified debt flows
work unchanged.

## Receipt scanning

**Scan receipt** in the expense modal opens the camera on iPhone/iPad (or a
file picker on desktop) and accepts photos (JPEG/PNG/WebP/HEIC) and PDFs up to
15 MB. HEIC photos and oversized images are re-encoded to a ≤2000 px JPEG in
the browser before upload (Safari decodes HEIC natively). The image is stored
as a **private trip file** owned by the uploader and linked to the expense —
a receipt badge on the ledger row opens it later.

The server hands the image to the instance's configured AI (the same provider
used for booking import: Anthropic, OpenAI-compatible, or a local
vision-capable model via Settings → Integrations → AI parsing, or the
admin-wide setting) and extracts the merchant, date, currency, total and every
line item — prefilled into the itemized split with **no one assigned**, ready
for you to hand lines to people. If no vision-capable AI is configured the
scan returns a clear message and you can type the lines in manually; the
photographed receipt stays attached either way.

> Native Apple VisionKit is not callable from a web app. The equivalent flow —
> native camera capture plus server-side AI extraction — needs no App Store
> install. If on-device VisionKit OCR is ever wanted, it requires an iOS
> companion app (or a Shortcut posting to `/api/trips/:id/budget/receipt-scan`
> with a bearer token).

## Public expense tabs ("send them a link")

A **tab** is a per-person running balance you share as an unguessable public
link — for anyone who owes you money, whether or not they're on the trip or
have a Travla account. Costs → **Tabs** creates one per person (first/last
name); every ledger expense row has an **Add to tab** action that charges an
amount (defaults to the expense total, editable to their share) onto the tab.
The label, amount, date and currency are **frozen at share time**, so editing
or deleting the original expense never rewrites what the other person saw.
Unpaid charges simply accumulate: share again next week and the same link
shows the new total.

The public page (`/public/tab/<token>`) needs no login and shows:

- the balance owing plus every charge and payment,
- your **payment details** from Settings → Account → Payment details
  (bank transfer, PayID, Venmo, other — only filled-in fields appear),
- the **original receipt** for a charge, but only when you ticked "share the
  receipt" for that specific charge (images/PDFs render inline; anything else
  is forced to download),
- a one-time **name confirmation** ("basic first and last name") stored on the
  tab so you can see who opened it,
- a one-use **join link** that registers an account bound to this trip
  (disappears once used).

When money arrives you **record a payment** on the tab (balance = charges −
payments); the link keeps working until you pause (revocable, reversible) or
delete the tab. Every route is rate-limited per IP and an invalid, paused or
deleted token answers 404.

### Member-linked tabs (the "single temp user")

A tab can be **linked to a trip member** — usually a **temp guest** created
right from the tab form (guests are credential-less members, one per person
per trip, assignable in every split like anyone else). A linked tab stops
being private bookkeeping and becomes a **shared trip resource**: every
member sees it, and any budget-editor shares a bill with the person simply by
assigning them in the expense split (equal, custom or per-line-item — all of
it flows through).

The public link then shows the person's **live ledger position**: their share
of every group bill, the netted "you owe X" amounts per creditor — each with
that member's own payment details — plus anything they **fronted** for the
group and the settle-ups already made (all converted into the trip currency,
including mixed-currency trips). Manual frozen charges are rejected on linked
tabs (the ledger is the single source of truth), and **recording a payment
writes real settlements credited to the people actually owed** (largest debt
first; any excess goes to the recorder who physically holds the money) — so
the Costs screen, the settlement engine and the public page always agree, no
matter which member taps "Record payment". At most one tab per member (races
collapse safely), never one for yourself; pausing or deleting a linked tab is
reserved for its creator or the trip owner; leaving the trip pauses the
member's link automatically. Unlinked name-only tabs keep the frozen-charge
behaviour. Personal (only-me) expenses never appear on anyone's public link.

If you haven't added payment details yet, the Tabs screen warns you and pops
the payment-details form right there (it's the same data as Settings →
Account → Payment details); the public page tells payers explicitly when a
creditor has no details on file.

**Accounting export**: each tab exports a CSV (Date/Type/Description/Amount/
Currency with a balance row) and the owner-side JSON endpoints below are a
stable shape for feeding AU accounting tools (Xero/MYOB CSV import works
as-is; direct OAuth integrations would need app credentials registered with
those providers).

## Venue-linked expenses

An expense can be pinned to one of the event's venues (a `places` row) via
`budget_items.place_id` (`ON DELETE SET NULL` — deleting the venue keeps the
expense). Both directions are first-class:

- **Expense side**: the expense modal has a searchable Venue picker; expense
  rows show a venue chip; `place_name` is hydrated by the server per viewer.
- **Venue side**: the venue card (PlaceInspector) shows a "Spend at this
  venue" section — every linked expense, a total in the event currency
  (frozen-rate conversion, same maths as the ledger), and an Add-expense
  button that opens the modal pre-pinned (`ExpensePrefill.placeId`).

Visibility follows the places rules: only venues the acting user can see are
linkable (a foreign or invisible venue 400s as unknown), and a private
venue's name hydrates as `null` for everyone else, so it never leaks through
a group expense. The client only re-sends a changed pin, so editing an
expense that carries someone else's private-venue link still saves.

## In-app guide and (i) popups

The Costs header has a **Guide** button (mobile too) opening
`ExpensesGuideModal` — nine sections covering lodging, splitting, scanning,
personal spend, venues, tabs/share links, settling, guests, and "What the
crew sees" (the visibility rules members ask about). Feature-scoped `(i)`
info dots (`client/src/components/shared/InfoDot.tsx`, popup-modal pattern)
sit next to the split selector, personal toggle, venue picker, scan button,
settle-up header, tabs modal and the venue spend section. All copy lives in
`shared/src/i18n/*/budget.ts` under `costs.info.*` and `costs.guide.*`,
translated across all 22 locales.

## API summary

- `POST /api/trips/:tripId/budget/receipt-scan` — multipart `file`; 200 →
  `{ file, receipt: { merchant, date, currency, total, items[] }, warnings }`;
  409/502 with a human-readable `error` (and the stored `file`) when no
  capable AI is configured or extraction fails.
- `POST/PUT /api/trips/:tripId/budget[/:id]` — accepts `is_private: boolean`,
  `receipt_file_id: number|null` and `place_id: number|null` (must be a
  visible venue of the same event, else 400); non-creator `is_private`
  changes are ignored.
- `GET/POST /api/trips/:tripId/expense-tabs` — list/create tabs (create body:
  `{ first_name, last_name?, currency? }`). Tabs are strictly per-owner.
- `POST /:id/items` `{ budget_item_id?, label?, amount, share_receipt? }`,
  `DELETE /:id/items/:itemId`, `POST /:id/payments` `{ amount, note? }`,
  `DELETE /:id/payments/:paymentId`, `POST /:id/revoke` `{ revoked }`,
  `DELETE /:id`, `GET /:id/export.csv`.
- Public, unauthenticated: `GET /api/public/tabs/:token`,
  `POST /api/public/tabs/:token/claim` `{ first_name, last_name }`,
  `GET /api/public/tabs/:token/items/:itemId/receipt`.
- Payment details live in user settings keys `payment_bank`, `payment_payid`,
  `payment_venmo`, `payment_other`.

## Suppliers (vendor CRM)

Every receipt scan files its merchant into the instance-wide **suppliers**
book (`suppliers` table, deduped on a normalized `name_key`): one row per
business, shared across all events. The scan pipeline
(`supplierEnrichment.autoSupplierAndVenue`) then:

1. copies the docket's printed contact block (address/phone/website) onto
   the row — the receipt is authoritative;
2. resolves the business against **Google Places** text search (via the
   existing `mapsService` key/quota plumbing, Nominatim fallback) — a hit is
   only trusted when its name matches the supplier's, and fills coordinates,
   category, phone, website and `google_place_id`;
3. asks the configured AI for a two-line `ai_summary` + category
   (fire-and-forget, never blocks the scan);
4. **auto-creates a venue** on the event map when coordinates are known —
   reusing any existing venue linked to the supplier or sharing its name.

All enrichment is gap-fill only: a human edit is never overwritten. The scan
response carries `supplier` + `place` so the expense modal links both on
save (`budget_items.supplier_id`, guarded like `place_id`).

The **Suppliers** page (`/suppliers`, global addon `suppliers`, enabled by
default) is the CRM: searchable list with cross-event aggregates (expenses,
events, venues, last interaction), detail view with editable contacts and
notes, AI summary, spend-by-event (frozen ledger rates), interaction
history and on-demand re-enrichment. Deleting a supplier releases links
(`ON DELETE SET NULL`) — history survives. API: `/api/addons/suppliers`
(list/create/detail/update/delete/enrich; delete = admin or creator).
