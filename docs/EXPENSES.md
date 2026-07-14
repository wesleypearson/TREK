# Expenses — group/personal splitting and receipt scanning (Travla custom)

Travla extends TREK's budget ledger with three things: personal expenses,
scanned receipts, and AI line-item extraction. Everything else (multi-payer,
equal/custom splits, settlement, "who owes whom" flows) is stock TREK.

## Group vs personal expenses

Every expense is a **group** expense by default: all trip members see it and it
counts toward the group settlement. Ticking **"Personal expense (only me)"**
makes it yours alone — other members never see it (the API returns 404, not
403, so its existence isn't revealed), it is excluded from the settlement and
per-person math, and its live-update events reach only your own devices. Only
the creator can flip an expense between personal and group.

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

## API summary

- `POST /api/trips/:tripId/budget/receipt-scan` — multipart `file`; 200 →
  `{ file, receipt: { merchant, date, currency, total, items[] }, warnings }`;
  409/502 with a human-readable `error` (and the stored `file`) when no
  capable AI is configured or extraction fails.
- `POST/PUT /api/trips/:tripId/budget[/:id]` — accepts `is_private: boolean`
  and `receipt_file_id: number|null`; non-creator `is_private` changes are
  ignored.
