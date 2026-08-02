// Streams a real, live LinkedIn login into admin-ui via Chrome DevTools
// Protocol screencasting, so a non-technical person can (re-)establish the
// session themselves — no terminal, no local Node setup, no file transfer.
// Replaces the readline-blocking flow in login.ts as the primary path; that
// script stays as the local/emergency fallback.
//
// Works with plain headless Chromium: CDP screencasting captures rendered
// page content via the protocol, not an OS-level screen grab, so there's no
// virtual-display (Xvfb/VNC) infrastructure needed even on a headless
// production box — the exact same headless+stealth mode withSession() already
// runs today.
import type { WebSocket } from "ws";
import type { Browser } from "playwright";
import { chromium } from "./browser.js";
import { SESSION_FILE } from "./session.js";
import { tryAcquireConnectLock, releaseConnectLock } from "./connect-lock.js";

// Fixed on purpose: the canvas admin-ui renders into is sized to match this
// exactly, so there's no mouse-coordinate scaling math to get right. A
// resizable canvas is a fast-follow, not needed for a single seat.
const VIEWPORT = { width: 1024, height: 768 };
const POLL_INTERVAL_MS = 1500;
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

const LOGIN_WALL_MARKERS = ["/login", "/checkpoint/", "/uas/"];
const AUTHENTICATED_URL_MARKERS = ["linkedin.com/feed", "linkedin.com/mynetwork"];

function isAuthenticatedUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (LOGIN_WALL_MARKERS.some((marker) => lower.includes(marker))) return false;
  return AUTHENTICATED_URL_MARKERS.some((marker) => lower.includes(marker));
}

async function notifyMarkConnected(): Promise<void> {
  const baseUrl = process.env.N8N_INTERNAL_URL;
  if (!baseUrl) return;
  try {
    await fetch(`${baseUrl}/linkedin-connection/mark-connected`, { method: "POST" });
  } catch {
    // Best-effort — the session file is already correct either way; only the
    // DB-backed status display would lag until the next successful connect.
  }
}

export async function startConnectSession(ws: WebSocket): Promise<void> {
  if (!tryAcquireConnectLock()) {
    ws.send(JSON.stringify({ type: "error", reason: "connect_session_already_active" }));
    ws.close();
    return;
  }

  let closed = false;
  let pollTimer: NodeJS.Timeout | undefined;
  let hardTimeout: NodeJS.Timeout | undefined;
  let browser: Browser | undefined;

  const finish = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    if (pollTimer) clearInterval(pollTimer);
    if (hardTimeout) clearTimeout(hardTimeout);
    releaseConnectLock();
    try {
      await browser?.close();
    } catch {
      // already gone
    }
    try {
      ws.close();
    } catch {
      // already closed
    }
  };

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded" });

    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.startScreencast" as any, {
      format: "jpeg",
      quality: 60,
      maxWidth: VIEWPORT.width,
      maxHeight: VIEWPORT.height,
    } as any);

    cdp.on("Page.screencastFrame" as any, (frame: { data: string; sessionId: number }) => {
      if (closed) return;
      ws.send(JSON.stringify({ type: "frame", data: frame.data }));
      cdp.send("Page.screencastFrameAck" as any, { sessionId: frame.sessionId } as any).catch(() => {
        // frame ack racing shutdown — harmless
      });
    });

    ws.send(JSON.stringify({ type: "init", width: VIEWPORT.width, height: VIEWPORT.height }));

    ws.on("message", async (raw) => {
      if (closed) return;
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === "cancel") {
        await finish();
        return;
      }
      if (msg.type !== "input") return;

      try {
        if (msg.kind === "mouse") {
          await cdp.send("Input.dispatchMouseEvent" as any, {
            type: msg.eventType,
            x: msg.x,
            y: msg.y,
            button: msg.button ?? "left",
            clickCount: msg.eventType === "mousePressed" ? 1 : 0,
            deltaX: msg.deltaX,
            deltaY: msg.deltaY,
          } as any);
        } else if (msg.kind === "key") {
          await cdp.send("Input.dispatchKeyEvent" as any, {
            type: msg.eventType,
            key: msg.key,
            code: msg.code,
            text: msg.text,
          } as any);
        }
      } catch {
        // Page may have navigated mid-dispatch (e.g. a checkpoint redirect) —
        // drop the event, the next frame/poll tick recovers on its own.
      }
    });

    ws.on("close", () => {
      void finish();
    });

    pollTimer = setInterval(async () => {
      if (closed) return;
      try {
        const url = page.url();
        if (isAuthenticatedUrl(url)) {
          await context.storageState({ path: SESSION_FILE });
          ws.send(JSON.stringify({ type: "login-success" }));
          await notifyMarkConnected();
          await finish();
        }
      } catch {
        // Page mid-navigation — try again next tick.
      }
    }, POLL_INTERVAL_MS);

    hardTimeout = setTimeout(() => {
      if (closed) return;
      ws.send(JSON.stringify({ type: "timeout" }));
      void finish();
    }, SESSION_TIMEOUT_MS);
  } catch (error) {
    ws.send(JSON.stringify({ type: "error", reason: (error as Error).message }));
    await finish();
  }
}
