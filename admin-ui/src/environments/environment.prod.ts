export const environment = {
  // Same-origin through admin-ui's own nginx (see nginx.conf's /webhook/
  // location, proxying to the n8n container by Docker service name) — no
  // SSH tunnel required to use the app itself. n8n's editor UI stays
  // tunnel-only; only its webhook surface is reachable this way.
  n8nWebhookBaseUrl: "/webhook",
  // Path only — same-origin through admin-ui's own nginx (see nginx.conf's
  // /li-connect/ws location), unlike n8nWebhookBaseUrl above.
  linkedinConnectWsUrl: "/li-connect/ws",
};
