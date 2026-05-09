import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { authenticate, generateTokens, setAuthCookies, clearAuthCookies, storeRefreshToken, validateRefreshToken, invalidateRefreshToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'El email, la contraseña y el nombre son obligatorios' });
    }

    // Always perform hash to mitigate timing-based user enumeration
    // Also add artificial delay to further obscure user existence detection
    const passwordHash = await bcrypt.hash(password, 12);
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));

    let user;
    try {
      // Role hardcodeado a USER para evitar auto-asignación de roles
      user = await prisma.user.create({
        data: { email, passwordHash, name, role: 'USER' },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });
    } catch (err) {
      // Si el email ya existe (P2002), responder con éxito genérico
      // para no revelar que el email está registrado
      if (err.code === 'P2002') {
        return res.status(201).json({ message: 'Usuario registrado correctamente' });
      }
      throw err;
    }

    const tokens = generateTokens(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await storeRefreshToken(user.id, tokens.refreshToken, expiresAt);
    setAuthCookies(res, tokens);

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'El email y la contraseña son obligatorios' });
    }

    // Always compute timing to prevent email enumeration timing attacks
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;

    // Use constant-time comparison: same generic message whether user exists or not
    if (!user || !valid) {
      // Add artificial delay to further mitigate timing-based user enumeration
      await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const tokens = generateTokens(user.id);
    // Store refresh token for rotation
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await storeRefreshToken(user.id, tokens.refreshToken, expiresAt);
    setAuthCookies(res, tokens);

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    // Validate token exists in DB (rotation check)
    const stored = await validateRefreshToken(refreshToken);
    if (!stored) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const { default: jwt } = await import('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      await invalidateRefreshToken(refreshToken);
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      await invalidateRefreshToken(refreshToken);
      clearAuthCookies(res);
      return res.status(401).json({ error: 'User not found' });
    }

    // Rotate: invalidate old token, create new tokens, store new refresh token
    await invalidateRefreshToken(refreshToken);
    const tokens = generateTokens(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await storeRefreshToken(user.id, tokens.refreshToken, expiresAt);
    setAuthCookies(res, tokens);

    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    await invalidateRefreshToken(refreshToken);
  }
  clearAuthCookies(res);
  res.json({ message: 'Logged out' });
});

export default router;