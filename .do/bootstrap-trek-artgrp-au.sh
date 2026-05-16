#!/usr/bin/env bash
# Pre-configured TREK bootstrap for trek.artgrp.au.
# Hands-off wrapper around .do/bootstrap.sh — no env vars required.
# Paste into the DigitalOcean web Console (as root):
#
#   bash <(curl -fsSL https://raw.githubusercontent.com/wesleypearson/TREK/claude/setup-digitalocean-family-UBQnO/.do/bootstrap-trek-artgrp-au.sh)
#
# That's it. Everything else is automatic.

set -euo pipefail

export DOMAIN_NAME="trek.artgrp.au"
export LETSENCRYPT_EMAIL="webmaster@artgrp.au"
export ADMIN_EMAIL="webmaster@artgrp.au"
export TZ="Australia/Brisbane"

bash <(curl -fsSL https://raw.githubusercontent.com/wesleypearson/TREK/claude/setup-digitalocean-family-UBQnO/.do/bootstrap.sh)
