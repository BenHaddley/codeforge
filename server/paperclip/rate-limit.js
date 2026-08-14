// Minimal in-memory sliding-window rate limiter, keyed by client IP.
// Good enough for a self-hosted tutor on a shared free API; replace with a
// shared store if the server is ever scaled horizontally.
'use strict';

class RateLimiter {
  constructor({ windowMs, max }) {
    this.windowMs = windowMs;
    this.max = max;
    this.hits = new Map(); // key -> [timestamps]
  }

  // Returns true when the request is allowed, false when it exceeds the
  // window limit.
  allow(key) {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const timestamps = (this.hits.get(key) || []).filter((t) => t > cutoff);
    if (timestamps.length >= this.max) {
      this.hits.set(key, timestamps);
      return false;
    }
    timestamps.push(now);
    this.hits.set(key, timestamps);
    return true;
  }
}

module.exports = { RateLimiter };