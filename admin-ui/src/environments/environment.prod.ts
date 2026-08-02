export const environment = {
  // Assumes the operator tunnels n8n to the same local port as in dev (see
  // infra/deploy-notes.md — admin-ui and n8n are each reached via their own
  // SSH tunnel). Proxying /webhook through admin-ui's own nginx instead is a
  // reasonable future simplification but is out of scope here.
  n8nWebhookBaseUrl: "http://localhost:5678/webhook",
  // Path only — same-origin through admin-ui's own nginx (see nginx.conf's
  // /li-connect/ws location), unlike n8nWebhookBaseUrl above.
  linkedinConnectWsUrl: "/li-connect/ws",
};
