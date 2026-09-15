const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_TRACKED_KEYS = 10_000;

const attemptsByKey = new Map<string, { count: number; windowStartedAt: number }>();

function makeRoom(now: number): void {
  if (attemptsByKey.size < MAX_TRACKED_KEYS) return;

  for (const [key, entry] of attemptsByKey) {
    if (now - entry.windowStartedAt > WINDOW_MS) attemptsByKey.delete(key);
    if (attemptsByKey.size < MAX_TRACKED_KEYS) return;
  }

  // Saldırgan çok sayıda benzersiz IP gönderebilir. Sınırsız Map büyümesi
  // yerine en eski kaydı düşürmek işlem belleğini üstten sınırlar.
  const oldestKey = attemptsByKey.keys().next().value;
  if (oldestKey) attemptsByKey.delete(oldestKey);
}

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
  const now = Date.now();
  if (!entry || now - entry.windowStartedAt > WINDOW_MS) {
    makeRoom(now);
    attemptsByKey.set(key, { count: 1, windowStartedAt: now });
    return;
  }
  entry.count += 1;
}

export function clearLoginAttempts(key: string): void {
  attemptsByKey.delete(key);
}
