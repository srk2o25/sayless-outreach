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
app.post("/actions/connect", async (req, res) => {
  const result = await sendConnectionRequest(req.body);
  res.json(result);
});

app.post("/actions/message", async (req, res) => {
  const result = await sendMessage(req.body);
  res.json(result);
});

app.post("/actions/visit", async (req, res) => {
  const result = await visitProfile(req.body);
  res.json(result);
});

app.post("/actions/invite", async (req, res) => {
  const result = await inviteToPage(req.body);
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`linkedin-worker listening on :${PORT}`);
});
