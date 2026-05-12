import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { randomBytes } from 'crypto';

export async function authenticate(req, res, next) {
  try {
    // Load token from httpOnly cookie first, fallback to Bearer header
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kambelleh-secret-key');
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'La sesión ha expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

export function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET || 'kambelleh-secret-key', { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, tokenId: randomBytes(16).toString('hex') }, process.env.JWT_REFRESH_SECRET || 'kambelleh-refresh-secret-key', { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export async function storeRefreshToken(userId, refreshToken, expiresAt) {
  await prisma.refreshToken.deleteMany({ where: { userId } });
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId, expiresAt },
  });
}

export async function validateRefreshToken(token) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored) return null;
  if (new Date() > stored.expiresAt) {
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    return null;
  }
  return stored;
}

export async function invalidateRefreshToken(token) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

export function setAuthCookies(res, tokens) {
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 min
  });
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAuthCookies(res) {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.clearCookie('token');
}