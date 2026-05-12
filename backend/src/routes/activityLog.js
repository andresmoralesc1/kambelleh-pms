import express from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/activity-logs
router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { resource, action, userId, page = 1, limit = 50 } = req.query;

    const where = {};
    if (resource) where.resource = resource;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    const totalPages = Math.ceil(total / limitNum);
    res.json({ logs, total, page: pageNum, limit: limitNum, totalPages });
  } catch (err) {
    next(err);
  }
});

export default router;
