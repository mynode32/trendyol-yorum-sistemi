import { Redis } from "@upstash/redis";

const WINDOW_MS = 15 * 60 * 1000;
const WINDOW_SECONDS = WINDOW_MS / 1000;
const MAX_ATTEMPTS = 5;
const MAX_TRACKED_KEYS = 10_000;

// Vercel gibi çoklu-instance/serverless ortamlarda process-memory limit instance'lar
// arasında paylaşılmaz. UPSTASH_REDIS_REST_URL/TOKEN tanımlıysa merkezi Redis tabanlı
// limit kullanılır; tanımlı değilse (yerel geliştirme, testler) tek-instance bellek
// tabanlı limite düşer.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function redisKey(key: string): string {
  return `login-rate-limit:${key}`;
}

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

/** Test yardımcı fonksiyonu — modül seviyesindeki bellek-içi durumu sıfırlar. */
export function resetLoginRateLimiter(): void {
  attemptsByKey.clear();
}

export async function isRateLimited(key: string): Promise<boolean> {
  if (redis) {
    const count = await redis.get<number>(redisKey(key));
    return (count ?? 0) >= MAX_ATTEMPTS;
  }

  const entry = attemptsByKey.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStartedAt > WINDOW_MS) {
    attemptsByKey.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export async function registerFailedLoginAttempt(key: string): Promise<void> {
  if (redis) {
    const count = await redis.incr(redisKey(key));
    // Sadece pencereyi yeni açan istek TTL basar; sonraki INCR'lar süreyi uzatmaz.
    if (count === 1) await redis.expire(redisKey(key), WINDOW_SECONDS);
    return;
  }

  const entry = attemptsByKey.get(key);
  const now = Date.now();
  if (!entry || now - entry.windowStartedAt > WINDOW_MS) {
    makeRoom(now);
    attemptsByKey.set(key, { count: 1, windowStartedAt: now });
    return;
  }
  entry.count += 1;
}

export async function clearLoginAttempts(key: string): Promise<void> {
  if (redis) {
    await redis.del(redisKey(key));
    return;
  }
  attemptsByKey.delete(key);
}
