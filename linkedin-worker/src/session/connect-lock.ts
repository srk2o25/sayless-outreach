// A connect session (re-establishing the LinkedIn login) and a dispatch action
// (withSession(), used by every action in ../actions/) must never run at the
// same time — both end with a storageState() write to SESSION_FILE, and
// whichever finishes last silently clobbers the other's result.
//
// In-process boolean is enough: linkedin-worker is a single Node process, not
// horizontally scaled, so there's no cross-process race to guard against.
let connectSessionActive = false;

export function tryAcquireConnectLock(): boolean {
  if (connectSessionActive) return false;
  connectSessionActive = true;
  return true;
}

export function releaseConnectLock(): void {
  connectSessionActive = false;
}

export function isConnectSessionActive(): boolean {
  return connectSessionActive;
}
