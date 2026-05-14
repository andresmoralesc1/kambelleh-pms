import { randomBytes } from 'crypto';

// In-memory store for CSRF tokens (per-user, per-session)
// In production, use Redis with TTL
const csrfTokens = new Map();

const CSRF_TOKEN_TTL = 15 * 60 * 1000; // 15 minutes

export function generateCsrfToken(userId) {
  const token = randomBytes(32).toString('hex');
  const now = Date.now();

  if (!csrfTokens.has(userId)) {
    csrfTokens.set(userId, []);
  }

  // Clean expired tokens for this user
  const userTokens = csrfTokens.get(userId).filter(t => now - t.createdAt < CSRF_TOKEN_TTL);

  userTokens.push({ token, createdAt: now });
  csrfTokens.set(userId, userTokens);

  return token;
}

export function validateCsrfToken(userId, token) {
  if (!token || !userId) return false;

  const userTokens = csrfTokens.get(userId);
  if (!userTokens) return false;

  const now = Date.now();
  const valid = userTokens.find(t => t.token === token && now - t.createdAt < CSRF_TOKEN_TTL);

  if (valid) {
    // Delete token after use (one-time use)
    const idx = userTokens.indexOf(valid);
    userTokens.splice(idx, 1);
  }

  return !!valid;
}

export function csrfMiddleware(req, res, next) {
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
  if (!validateCsrfToken(req.user.id, token)) {
    return res.status(403).json({ error: 'Token CSRF inválido o expirado' });
  }

  next();
}

export function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [userId, tokens] of csrfTokens.entries()) {
    const valid = tokens.filter(t => now - t.createdAt < CSRF_TOKEN_TTL);
    if (valid.length === 0) {
      csrfTokens.delete(userId);
    } else {
      csrfTokens.set(userId, valid);
    }
  }
}