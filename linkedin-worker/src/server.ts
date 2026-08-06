import express from "express";
import { WebSocketServer } from "ws";
import { sendConnectionRequest } from "./actions/connect.js";
import { sendMessage } from "./actions/message.js";
import { visitProfile } from "./actions/visit.js";
import { inviteToPage } from "./actions/invite.js";
import { hasSession, clearSession } from "./session/session.js";
import { isConnectSessionActive } from "./session/connect-lock.js";
import { startConnectSession } from "./session/connect-session.js";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT ?? 4100);

app.get("/health", (_req, res) => {
  res.json({ ok: true, sessionReady: hasSession(), connectSessionActive: isConnectSessionActive() });
});

// n8n's linkedin-dispatch workflow calls these — one action per HTTP call, one
// prospect per call. Batching stays in n8n; this service only knows how to do one thing at a time.
//
// Every route is wrapped: an action throwing (no session, selector not found,
// Playwright timeout, ...) must fail that one request, not take down the
// process — a crashed worker drops every other in-flight dispatch too.
function handleAction(
  action: (body: any) => Promise<{ ok: boolean; skippedReason?: string }>
) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const result = await action(req.body);
      res.json(result);
    } catch (error) {
      res.json({ ok: false, skippedReason: (error as Error).message });
    }
  };
}

app.post("/actions/connect", handleAction(sendConnectionRequest));
app.post("/actions/message", handleAction(sendMessage));
app.post("/actions/visit", handleAction(visitProfile));
app.post("/actions/invite", handleAction(inviteToPage));

// Admin-initiated disconnect — clears the session file so a stale/unwanted
// session can't keep being used. Not part of the dispatch action set above
// (no profileUrl, nothing to rate-limit), but shares the same
// throw-safe wrapper.
app.post("/actions/disconnect", handleAction(async () => {
  clearSession();
  return { ok: true };
}));

const server = app.listen(PORT, () => {
  console.log(`linkedin-worker listening on :${PORT}`);
});

// admin-ui's linkedin-connection screen is the one feature allowed to talk to
// this service directly instead of through n8n — a live bidirectional
// screencast can't be proxied through n8n's stateless webhook model. See
// admin-ui/CLAUDE.md for the documented exception.
const wss = new WebSocketServer({ server, path: "/li-connect/ws" });
wss.on("connection", (ws) => {
  void startConnectSession(ws);
});
