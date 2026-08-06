# Deploy notes

## Target: AWS EC2 (shared with crewzo-webapp)

This instance also runs crewzo-webapp. Sayless Outreach stays isolated at the OS/Docker level instead of by separate hardware — every rule below exists to keep a LinkedIn incident or a bad script from touching product infra despite sharing the box.

- **Separate Compose project.** Deploy with `docker compose -p sayless-outreach up -d` (not the default project name) so Sayless Outreach's containers, network, and volumes never collide with or attach to crewzo-webapp's.
- **Non-default ports.** Before filling in `.env`, check what crewzo-webapp already binds on this host (`sudo ss -tlnp` or `docker ps`) — crewzo-webapp's Postgres is likely already on `5432`. Set `POSTGRES_PORT`, `N8N_PORT`, `LINKEDIN_WORKER_PORT`, `ADMIN_UI_PORT` in `.env` to whatever's free; the compose file already reads these from env, nothing to edit there.
- **Resource limits**, so Playwright's Chromium can't starve the crewzo-webapp API under load — add to each service in `docker-compose.yml` before first deploy:
  ```yaml
  deploy:
    resources:
      limits:
        memory: 1g   # linkedin-worker specifically; adjust per service
  ```
- **No shared volumes, no shared `.env`.** Sayless Outreach's `.env` lives only in this repo's directory on the host.

### Instance sizing

Playwright's headless Chromium needs comfortable headroom on top of whatever crewzo-webapp already uses — undersizing shows up as flaky, slow-loading pages that look like bot behavior to LinkedIn, which is exactly what we're trying to avoid. Check current free memory (`free -h`) before deploying; if it's tight, that's a sizing conversation to have before, not after, LinkedIn actions start failing.

### Security group

- Inbound: SSH (22) from your IP only. Everything else (`admin-ui`, `n8n`) reached via SSH tunnel or a VPN, not exposed publicly — this is an internal tool, not a customer-facing product.
- No inbound rule should ever expose Postgres (5432, or whatever port Sayless Outreach's Postgres ends up on) to `0.0.0.0/0`.

### Setup

```bash
# on the EC2 instance
which docker || sudo yum install -y docker git   # or apt, depending on AMI — crewzo-webapp being on this box likely means Docker is already installed
sudo systemctl enable --now docker
git clone <this-repo> sayless-outreach && cd sayless-outreach
cp .env.example .env    # fill in real values, including non-colliding ports — never commit this file
docker compose -p sayless-outreach up -d
```

Then, one-time and interactive (needs a display — run `linkedin-worker`'s login script from a local machine and copy the resulting `session-state/linkedin.json` to the server, rather than trying to run a headed browser on a headless EC2 instance):

```bash
# locally
cd linkedin-worker && npm install && npm run login
scp session-state/linkedin.json ec2-user@<host>:~/sayless-outreach/linkedin-worker/session-state/
```

### DNS / Brevo

Add Brevo's SPF/DKIM/DMARC records to `sayless.co.in`'s DNS (root domain, not a subdomain — see `docs/architecture.md` for the warmup schedule) before sending anything.

## Status

Deployed 2026-08-06 on the shared crewzo-webapp EC2 instance (resized to t3.small / 2GB RAM,
30GB disk, to make room for this stack). Running via `docker compose -p sayless-outreach up -d`,
all four services healthy: `db`, `n8n`, `linkedin-worker`, `admin-ui`. Ports left at their
`.env.example` defaults (5432/5678/4100/4300) — none collided with crewzo-webapp's MySQL (3306)
or .NET API (5000).

n8n needed an explicit `NODE_OPTIONS=--max-old-space-size=480` — without it, Node/V8 sized its
default heap off total host RAM (1.9GB) instead of the container's cgroup memory limit and
crash-looped with an OOM. Keep this in mind if n8n's memory limit is raised later — the heap cap
should stay comfortably under whatever the container limit is.

Not yet done: LinkedIn session login (needs a local interactive browser — see step below), public
subdomain + SSL + basic auth (tracked separately, not part of this repo's scope).
