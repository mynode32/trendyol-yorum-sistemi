const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const attemptsByKey = new Map<string, { count: number; windowStartedAt: number }>();

/** Test yardımcı fonksiyonu — modül seviyesindeki durumu sıfırlar. */
export function resetLoginRateLimiter(): void {
  attemptsByKey.clear();
}

export function isRateLimited(key: string): boolean {
  const entry = attemptsByKey.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStartedAt > WINDOW_MS) {
    attemptsByKey.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function registerFailedLoginAttempt(key: string): void {
  const entry = attemptsByKey.get(key);
  if (!entry || Date.now() - entry.windowStartedAt > WINDOW_MS) {
    attemptsByKey.set(key, { count: 1, windowStartedAt: Date.now() });
    return;
  }
  entry.count += 1;
}

export function clearLoginAttempts(key: string): void {
  attemptsByKey.delete(key);
}
