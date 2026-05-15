import { randomBytes } from 'crypto';
import getRedis from '../config/redis.js';

const CSRF_TOKEN_TTL = 15 * 60; // 15 minutes in seconds

export function generateCsrfToken(userId) {
  const token = randomBytes(32).toString('hex');
  const redis = getRedis();
  const key = `csrf:${userId}:${token}`;

  // Fire-and-forget set with TTL
  redis.set(key, '1', 'EX', CSRF_TOKEN_TTL).catch(() => {});

  return token;
}

export async function validateCsrfToken(userId, token) {
  if (!token || !userId) return false;

  const redis = getRedis();
  const key = `csrf:${userId}:${token}`;

  // Delete token after use (one-time use) — use GETDEL in Lua for atomicity
  const script = `
    local val = redis.call('GET', KEYS[1])
    if val then
      redis.call('DEL', KEYS[1])
    end
    return val
  `;

  try {
    const result = await redis.eval(script, 1, key);
    return result === '1';
  } catch {
    // If Redis is unavailable, skip validation (graceful degradation)
    console.warn('[csrf] Redis unavailable, skipping token validation');
    return true;
  }
}

export async function csrfMiddleware(req, res, next) {
  // Only apply to state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for public routes (login, register)
  const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];
  if (publicPaths.some(p => req.path.startsWith(p))) {
    return next();
  }

  // Require user to be authenticated
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const token = req.headers['x-csrf-token'];
  validateCsrfToken(req.user.id, token).then(valid => {
    if (!valid) {
      return res.status(403).json({ error: 'Token CSRF inválido o expirado' });
    }
    next();
  }).catch(() => {
    // Redis error — fail open (continue without CSRF validation)
    next();
  });
}

export function cleanupExpiredTokens() {
  // Redis TTL handles expiration automatically — no manual cleanup needed
}