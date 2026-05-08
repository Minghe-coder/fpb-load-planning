// Rate limiter in-memory per il login.
// Blocca un IP dopo 5 tentativi falliti per 15 minuti.

interface Bucket {
  count: number
  firstAttempt: number
}

const buckets = new Map<string, Bucket>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minuti

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const bucket = buckets.get(ip)

  if (!bucket || now - bucket.firstAttempt > WINDOW_MS) {
    buckets.set(ip, { count: 1, firstAttempt: now })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    const retryAfterMs = WINDOW_MS - (now - bucket.firstAttempt)
    return { allowed: false, retryAfterMs }
  }

  bucket.count++
  return { allowed: true, retryAfterMs: 0 }
}

export function resetRateLimit(ip: string) {
  buckets.delete(ip)
}

// Pulizia automatica ogni ora per evitare memory leak
setInterval(() => {
  const now = Date.now()
  for (const [ip, bucket] of buckets.entries()) {
    if (now - bucket.firstAttempt > WINDOW_MS) buckets.delete(ip)
  }
}, 60 * 60 * 1000)
