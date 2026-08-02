export const environment = {
  n8nWebhookBaseUrl: "http://localhost:5678/webhook",
  // linkedin-worker runs as a bare host process in local dev (see
  // docker-compose.override.yml), reached directly — no nginx proxy exists
  // in dev. Full URL here; environment.prod.ts holds just a path instead,
  // since prod reaches it same-origin through admin-ui's own nginx.
  linkedinConnectWsUrl: "ws://localhost:4100/li-connect/ws",
};
