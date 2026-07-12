# Deploy notes

## Target: AWS EC2

**Before deploying: confirm this is a separate EC2 instance from whatever runs `crewzo-webapp`'s backend.** The whole reason Cadence is a standalone repo is so a LinkedIn account restriction or a bad script can't reach product infra. If only one instance is available, at minimum run Cadence in its own Docker network with no shared ports/volumes with any crewzo-webapp containers, and treat that as a temporary state, not the target.

### Instance sizing

Playwright's headless Chromium needs comfortable headroom — undersizing shows up as flaky, slow-loading pages that look like bot behavior to LinkedIn, which is exactly what we're trying to avoid.

- Minimum: `t3.small` (2 GiB RAM) — workable but tight once n8n + Postgres + the browser are all running.
- Recommended: `t3.medium` (4 GiB RAM) for headroom.

### Security group

- Inbound: SSH (22) from your IP only. Everything else (`admin-ui`, `n8n`) reached via SSH tunnel or a VPN, not exposed publicly — this is an internal tool, not a customer-facing product.
- No inbound rule should ever expose Postgres (5432) to `0.0.0.0/0`.

### Setup

```bash
# on the EC2 instance
sudo yum install -y docker git   # or apt, depending on AMI
sudo systemctl enable --now docker
git clone <this-repo> cadence && cd cadence
cp .env.example .env    # fill in real values — never commit this file
docker compose up -d
```

Then, one-time and interactive (needs a display — run `linkedin-worker`'s login script from a local machine and copy the resulting `session-state/linkedin.json` to the server, rather than trying to run a headed browser on a headless EC2 instance):

```bash
# locally
cd linkedin-worker && npm install && npm run login
scp session-state/linkedin.json ec2-user@<host>:~/cadence/linkedin-worker/session-state/
```

### DNS / Brevo

Add Brevo's SPF/DKIM/DMARC records to `sayless.ai`'s DNS for the `cadence.sayless.ai` subdomain before sending anything — see `docs/architecture.md` for the warmup schedule.

## Status

Not yet deployed. Update this file once the target instance is confirmed.
