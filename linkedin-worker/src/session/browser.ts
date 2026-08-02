// Single place the stealth plugin gets registered — session.ts, login.ts, and
// connect-session.ts all import the chromium launcher from here instead of
// each calling chromium.use(stealth()) themselves.
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";

chromium.use(stealth());

export { chromium };
