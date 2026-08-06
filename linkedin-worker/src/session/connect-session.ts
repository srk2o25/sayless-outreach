// Streams a real, live LinkedIn login into admin-ui via Chrome DevTools
// Protocol screencasting, so a non-technical person can (re-)establish the
// session themselves — no terminal, no local Node setup, no file transfer.
// Replaces the readline-blocking flow in login.ts as the primary path; that
// script stays as the local/emergency fallback.
//
// Two modes, picked by the client's first "start" message:
//   - "live": today's original behavior — screencast the login page
//     immediately, the human does everything by hand (including any 2FA).
//   - "credentials": a fast path — submit email/password headlessly, handle
//     a plain one-time-code challenge inline if LinkedIn asks for one, and
//     if LinkedIn throws anything harder (CAPTCHA, phone-approve, or
//     anything this code doesn't recognize), fail open into the exact same
//     live relay on the *same* in-flight page rather than getting stuck —
//     the user sees and finishes whatever challenge is already on screen.
//
// Works with plain headless Chromium: CDP screencasting captures rendered
// page content via the protocol, not an OS-level screen grab, so there's no
// virtual-display (Xvfb/VNC) infrastructure needed even on a headless
// production box — the exact same headless+stealth mode withSession() already
// runs today.
import type { WebSocket } from "ws";
import type { Browser, BrowserContext, CDPSession, Page } from "playwright";
import { chromium } from "./browser.js";
import { SESSION_FILE } from "./session.js";
import { tryAcquireConnectLock, releaseConnectLock } from "./connect-lock.js";

// Fixed on purpose: the canvas admin-ui renders into is sized to match this
// exactly, so there's no mouse-coordinate scaling math to get right. A
// resizable canvas is a fast-follow, not needed for a single seat.
const VIEWPORT = { width: 1024, height: 768 };
const POLL_INTERVAL_MS = 1500;
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const CREDENTIALS_POLL_INTERVAL_MS = 800;
const CREDENTIALS_POLL_ATTEMPTS = 10; // ~8s bounded wait before falling back
const MAX_CODE_ATTEMPTS = 2;

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

type PageState = "authenticated" | "invalid_credentials" | "need_code" | "unknown";

// Verified against the real live site: LinkedIn's field ids are
// React-generated and change every page load, and each field has a hidden
// duplicate variant (a "username webauthn" autocomplete alternate) — scoping
// by the stable `autocomplete` attribute plus `:visible` is what actually
// resolves to the one real, fillable field.
async function detectPageState(page: Page): Promise<PageState> {
  const url = page.url();
  if (isAuthenticatedUrl(url)) return "authenticated";

  const bodyText = await page
    .locator("body")
    .innerText()
    .catch(() => "");
  if (/wrong email or password/i.test(bodyText)) return "invalid_credentials";

  // TODO: verify selector — never exercised against a real 2FA challenge in
  // this pass (would need a test account with 2FA enabled). If this never
  // matches, the design fails open: the bounded poll in runCredentialsMode
  // just exhausts and hands off to the live relay instead, where a human
  // sees and completes whatever LinkedIn is actually showing.
  const hasCodeInput = (await page.locator('input[autocomplete="one-time-code"]:visible').count()) > 0;
  if (hasCodeInput || /verification code|enter the code|security code/i.test(bodyText)) {
    return "need_code";
  }

  return "unknown";
}

export async function startConnectSession(ws: WebSocket): Promise<void> {
  if (!tryAcquireConnectLock()) {
    ws.send(JSON.stringify({ type: "error", reason: "connect_session_already_active" }));
    ws.close();
    return;
  }

  let closed = false;
  let started = false;
  let pollTimer: NodeJS.Timeout | undefined;
  let hardTimeout: NodeJS.Timeout | undefined;
  let browser: Browser | undefined;
  let activeCdp: CDPSession | undefined;
  let pendingCodeResolve: ((code: string | null) => void) | null = null;

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

  hardTimeout = setTimeout(() => {
    if (closed) return;
    ws.send(JSON.stringify({ type: "timeout" }));
    void finish();
  }, SESSION_TIMEOUT_MS);

  // Shared by both modes: screencasts an already-navigated page, forwards
  // input, and polls for the authenticated URL. mode "live" calls this right
  // after navigating to /login; the credentials path calls it only as a
  // fallback, on the same page a partial login attempt already progressed.
  async function startLiveRelay(context: BrowserContext, page: Page): Promise<void> {
    const cdp = await context.newCDPSession(page);
    activeCdp = cdp;
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
  }

  async function runLiveMode(): Promise<void> {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded" });
    await startLiveRelay(context, page);
  }

  function waitForCode(): Promise<string | null> {
    return new Promise((resolve) => {
      pendingCodeResolve = resolve;
    });
  }

  async function runCredentialsMode(email: string, password: string): Promise<void> {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded" });

    const emailField = page.locator('input[autocomplete^="username"]:visible').first();
    const passwordField = page.locator('input[autocomplete="current-password"]:visible').first();
    // The button is type="button", not type="submit" — and "Sign in with
    // Apple" also contains "Sign in" as a substring, so match the exact name.
    const signInButton = page
      .getByRole("button", { name: "Sign in", exact: true })
      .and(page.locator(":visible"))
      .first();

    await emailField.fill(email);
    await passwordField.fill(password);
    await signInButton.click();

    let codeAttempts = 0;

    for (let attempt = 0; attempt < CREDENTIALS_POLL_ATTEMPTS; attempt++) {
      if (closed) return;
      await new Promise((resolve) => setTimeout(resolve, CREDENTIALS_POLL_INTERVAL_MS));
      const state = await detectPageState(page);

      if (state === "authenticated") {
        await context.storageState({ path: SESSION_FILE });
        ws.send(JSON.stringify({ type: "login-success" }));
        await notifyMarkConnected();
        await finish();
        return;
      }

      if (state === "invalid_credentials") {
        ws.send(JSON.stringify({ type: "invalid_credentials" }));
        await finish();
        return;
      }

      if (state === "need_code") {
        codeAttempts++;
        if (codeAttempts > MAX_CODE_ATTEMPTS) break;

        ws.send(JSON.stringify({ type: "need_code" }));
        const code = await waitForCode();
        if (closed) return;
        if (code === null) break; // cancelled, or client gave up waiting

        // TODO: verify selector — see detectPageState's note above, same
        // "never exercised against a real challenge" caveat applies here.
        const codeField = page.locator('input[autocomplete="one-time-code"]:visible').first();
        await codeField.fill(code).catch(() => {});
        const continueButton = page
          .getByRole("button", { name: /submit|continue|verify/i })
          .and(page.locator(":visible"))
          .first();
        await continueButton.click().catch(() => {});
        continue;
      }

      // "unknown" — keep polling within the bounded attempts above, then
      // fall through to the live-relay handoff below.
    }

    if (closed) return;
    // Bounded wait exhausted without a clean success/failure — fail open:
    // hand off into the live relay on this same in-flight page instead of
    // restarting from a blank /login, so the user sees whatever LinkedIn is
    // actually asking for right now.
    ws.send(JSON.stringify({ type: "fallback_required" }));
    await startLiveRelay(context, page);
  }

  ws.on("message", async (raw) => {
    if (closed) return;
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "cancel") {
      if (pendingCodeResolve) {
        pendingCodeResolve(null);
        pendingCodeResolve = null;
      }
      await finish();
      return;
    }

    if (msg.type === "start") {
      if (started) return;
      started = true;
      try {
        if (msg.mode === "credentials") {
          await runCredentialsMode(String(msg.email ?? ""), String(msg.password ?? ""));
        } else {
          await runLiveMode();
        }
      } catch (error) {
        if (!closed) {
          ws.send(JSON.stringify({ type: "error", reason: (error as Error).message }));
          await finish();
        }
      }
      return;
    }

    if (msg.type === "code") {
      if (pendingCodeResolve) {
        const resolve = pendingCodeResolve;
        pendingCodeResolve = null;
        resolve(String(msg.value ?? ""));
      }
      return;
    }

    if (msg.type !== "input" || !activeCdp) return;

    try {
      if (msg.kind === "mouse") {
        await activeCdp.send("Input.dispatchMouseEvent" as any, {
          type: msg.eventType,
          x: msg.x,
          y: msg.y,
          button: msg.button ?? "left",
          clickCount: msg.eventType === "mousePressed" ? 1 : 0,
          deltaX: msg.deltaX,
          deltaY: msg.deltaY,
        } as any);
      } else if (msg.kind === "key") {
        await activeCdp.send("Input.dispatchKeyEvent" as any, {
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
    if (pendingCodeResolve) {
      pendingCodeResolve(null);
      pendingCodeResolve = null;
    }
    void finish();
  });
}
