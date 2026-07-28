const keyFor = (uid: string) => `handwrought:geminiKey:${uid}`;

export function getApiKey(uid: string): string | null {
  try {
    return window.localStorage.getItem(keyFor(uid));
  } catch {
    return null;
  }
}

export function setApiKey(uid: string, key: string): void {
  try {
    window.localStorage.setItem(keyFor(uid), key);
  } catch {
    // storage full/blocked — non-fatal
  }
}

export function clearApiKey(uid: string): void {
  try {
    window.localStorage.removeItem(keyFor(uid));
  } catch {
    // non-fatal
  }
}
