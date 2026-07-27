import express from "express";
import { sendConnectionRequest } from "./actions/connect.js";
import { sendMessage } from "./actions/message.js";
import { visitProfile } from "./actions/visit.js";
import { inviteToPage } from "./actions/invite.js";
import { hasSession } from "./session/session.js";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT ?? 4100);

app.get("/health", (_req, res) => {
  res.json({ ok: true, sessionReady: hasSession() });
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

app.listen(PORT, () => {
  console.log(`linkedin-worker listening on :${PORT}`);
});
