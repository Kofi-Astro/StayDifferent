/**
 * Minimal in-memory rate limiter (no dependencies).
 * Limits how many requests one IP can make to a route per time window —
 * enough to stop form spam and password guessing on a single-server site.
 *
 * @param {{ max: number, windowMs?: number }} opts
 */
export function rateLimit({ max, windowMs = 15 * 60 * 1000 }) {
  /** @type {Map<string, { count: number, reset: number }>} */
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const entry = hits.get(key);

    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
    } else if (++entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
    }

    // Occasionally sweep expired entries so the map can't grow forever.
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    next();
  };
}
