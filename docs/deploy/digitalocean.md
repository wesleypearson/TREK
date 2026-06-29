# Deploy TREK on DigitalOcean (Droplet)

A phone-friendly walkthrough. Designed to be done in ~10 minutes from a phone, with the family looking over your shoulder.

## What you'll end up with

TREK running at `https://trek.yourdomain.com`, with a real Let's Encrypt HTTPS cert, on a $6/month DigitalOcean Droplet. Your data — trips, accounts, photos — lives on the Droplet's persistent disk. WebSocket real-time sync just works.

> **Why not App Platform?** DigitalOcean's App Platform has no persistent filesystem — it wipes everything on each redeploy/restart. TREK keeps its SQLite database and uploads on the local disk, so a Droplet is the right fit.

## Before you start

You'll need:

1. A **DigitalOcean account** (with a payment method — about $6/month).
2. A **domain name** you own (any registrar — Namecheap, Cloudflare, Google Domains, etc.). You'll add one DNS record.
3. The cloud-init script: [`.do/cloud-init.yaml`](../../.do/cloud-init.yaml) in this repo. Open it on your phone in another tab — you'll paste it in Step 2.

---

## Step 1 — Create the Droplet

In the DigitalOcean mobile site/app:

1. **Create → Droplets**.
2. **Region**: closest to your family.
3. **Image**: Ubuntu **24.04 LTS** (x64).
4. **Size**: Basic → Regular SSD → **$6/mo** (1 GB RAM, 1 vCPU, 25 GB disk). Plenty for a family of ~10 with a couple of trips.
5. **Authentication**: SSH key recommended. If you don't have one on your phone, "Password" works — DO will email you the root password.
6. **Hostname**: `trek` (or whatever you like).

Don't hit **Create Droplet** yet — first do Step 2.

## Step 2 — Paste the cloud-init script

Still on the Droplet creation page, scroll down to **Advanced Options** and toggle on **Add Initialization scripts (cloud-init)**.

1. Open [`.do/cloud-init.yaml`](../../.do/cloud-init.yaml) in another browser tab.
2. Copy the entire file.
3. Paste it into the cloud-init text box.
4. **Edit the four lines** at the top of the `runcmd:` block — they're flagged with `# === EDIT ME ===`:

   ```bash
   DOMAIN_NAME="trek.yourdomain.com"          # ← your subdomain
   LETSENCRYPT_EMAIL="you@yourdomain.com"     # ← used by Let's Encrypt for cert expiry warnings
   ADMIN_EMAIL="family@yourdomain.com"        # ← email of the first admin account
   TZ="America/Los_Angeles"                   # ← your timezone (use "UTC" if unsure)
   ```

Now hit **Create Droplet**. It'll boot in ~30 seconds; provisioning continues in the background for 2–3 minutes.

## Step 3 — Point DNS at the Droplet

Once the Droplet boots, copy its public **IPv4 address** from the DO Droplet page.

At your domain registrar's DNS panel, add:

| Type | Host  | Value             | TTL    |
|------|-------|-------------------|--------|
| A    | trek  | (Droplet IPv4)    | 5 min  |

Replace `trek` with whatever subdomain you put in `DOMAIN_NAME`.

> Most registrars propagate within 1–5 minutes. You can check with `dig trek.yourdomain.com` or [dnschecker.org](https://dnschecker.org).

## Step 4 — Wait ~3 minutes

First boot does this in the background:

1. Updates Ubuntu, installs Docker.
2. Pulls the TREK Docker image.
3. Starts TREK + Caddy.
4. Caddy requests a Let's Encrypt cert (this needs DNS to be live, so make sure Step 3 is done first).

Refresh `https://trek.yourdomain.com` in your phone browser until the TREK login page loads. If you see a cert error initially, wait a minute — Caddy is still negotiating with Let's Encrypt.

## Step 5 — Get the admin password

The cloud-init script generated a random admin password and saved it to a file on the Droplet.

In the DigitalOcean Droplet page:

1. **Console** (top right) → opens an in-browser terminal.
2. Log in as `root` (use your SSH key, or the password DO emailed you).
3. Run:

   ```
   cat /root/trek-credentials.txt
   ```

You'll see the URL, the admin email, and the password. Show the family.

## Step 6 — Invite the family

Log in to TREK, then:

1. **Admin Panel → Users → Invite**.
2. Generate an invite link (you can make it reusable for your whole household).
3. Share via your group chat. Each family member registers their own account.

That's it — you can start a trip and they'll see edits in real time.

---

## Maintenance

**Backups.** TREK has built-in backups (Admin Panel → Backups). For belt-and-suspenders, also enable **DigitalOcean Snapshots** on the Droplet (Settings → Snapshots → enable weekly, ~$1.20/mo).

**Updates.** From the DO Console (or SSH):

```
cd /opt/trek && docker compose pull && docker compose up -d
```

Your data in `/opt/trek/data` and `/opt/trek/uploads` is untouched.

**Cost.** ~$6/mo Droplet + ~$1.20/mo for snapshots = **~$7/mo**.

---

## Troubleshooting

**"Site can't be reached"** — DNS isn't live yet, or Caddy is still booting. Check `dig trek.yourdomain.com` returns the Droplet IP. Then on the Droplet:

```
cd /opt/trek && docker compose logs --tail=50 caddy
```

**Cert error / `HTTPS 503` from sandboxes** — Let's Encrypt rejected the cert request, usually because DNS wasn't live when Caddy first tried. Caddy retries with exponential backoff (1m, 5m, 15m). To force an immediate retry without waiting:

```
sudo systemctl restart trek
```

Or reboot the Droplet from the DO console — that reliably kicks Caddy out of any ACME backoff state and on second boot the cert almost always lands within ~10s if DNS is correct.

**Cloud-init seems stuck on a fresh Ubuntu 24.04 Droplet** — Ubuntu's `unattended-upgrades` daemon auto-starts on first boot and holds the apt lock for 5–15 min, silently blocking `cloud-init`'s `packages:` directive. The bootstrap script and `.do/cloud-init.yaml` in this repo both disable `unattended-upgrades` up front to avoid this, but if you're using your own cloud-init, do this **before any apt operation**:

```bash
systemctl mask unattended-upgrades.service apt-daily.timer apt-daily-upgrade.timer apt-daily.service apt-daily-upgrade.service
pkill -9 -f unattended-upgrade
rm -f /var/lib/apt/lists/lock /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock
```

**Cloudflare in the way** — if `trek.yourdomain.com` is on Cloudflare, the proxy (orange cloud) **must be off** (DNS only / gray cloud) when Caddy first requests its cert, or the Let's Encrypt HTTP-01 challenge can't reach the origin. Once Caddy has a valid cert, you can switch the proxy back on, but set Cloudflare's **SSL/TLS → Full (strict)** at the same time so the proxy validates the origin cert.

**Can't find the admin password** — if `/root/trek-credentials.txt` is missing (rare cloud-init failure), tail the boot log instead:

```
grep -A3 "Admin:" /var/log/cloud-init-output.log
```

**Need to start over** — destroy the Droplet from the DO console (you only pay hourly for the time it ran), and create a fresh one. With your DNS already configured, the second attempt is even faster.

**SSH from your phone** — DigitalOcean has a built-in web Console under each Droplet's page. No SSH client needed.

---

## What's running on the Droplet

```
/opt/trek/
├── docker-compose.yml    # TREK + Caddy services
├── Caddyfile             # one-line reverse proxy + auto-TLS
├── .env                  # all config + secrets (mode 0600)
├── data/                 # SQLite DB + logs       ← your data
└── uploads/              # photos, files          ← your data

/etc/systemd/system/trek.service   # starts containers on boot
/root/trek-credentials.txt         # admin login + encryption key
```

For deeper config (SSO/OIDC, SMTP, addon toggles), see the main [README](../../README.md#environment-variables) — just add to `/opt/trek/.env` and run `docker compose up -d`.
