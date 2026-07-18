// In-memory rate limiter for /api/auth/* routes.
//
// Task 4.5's spec explicitly allows "a simple in-memory store OR Upstash
// Redis" for this. Using in-memory here on purpose: this project's Upstash
// Redis account currently has its monthly request quota exhausted (see
// handoff notes), so adding more load there isn't a good idea even once it
// resets -- auth endpoints get hit far more often than the AI queue ever
// will, and this doesn't need Redis's durability/distribution guarantees
// for what it's protecting against here (basic brute-force/spam throttling
// on a small institute app, not a high-security target).
//
// Known limitation: this Map lives in a single serverless function
// instance's memory. Vercel may run multiple instances concurrently under
// load, each with its own independent counter -- so the *effective* limit
// across the whole deployment could exceed 10/min per IP under heavy
// concurrent traffic from many regions/instances at once. If this ever
// needs to be a hard, globally-enforced guarantee, switch to Upstash Redis
// (INCR + EXPIRE per IP key) instead.

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;

const store = new Map<string, RateLimitEntry>();

// Opportunistic cleanup so the Map doesn't grow unbounded over the
// lifetime of a warm serverless instance. Runs at most once per window.
let lastCleanup = Date.now();
function cleanupIfNeeded() {
  const now = Date.now();
  if (now - lastCleanup < WINDOW_MS) return;
  lastCleanup = now;
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (now - entry.windowStart > WINDOW_MS) {
      store.delete(key);
    }
  });
}

export function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  cleanupIfNeeded();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil(
      (entry.windowStart + WINDOW_MS - now) / 1000,
    );
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true };
}

/**
 * Best-effort client IP extraction from Vercel's forwarded headers.
 * Falls back to a constant key if unavailable (e.g. local dev without a
 * proxy) so rate limiting degrades gracefully instead of throwing.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
