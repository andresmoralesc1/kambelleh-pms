import express from 'express';
import prisma from '../config/database.js';

const router = express.Router();

// GET /api/settings - Devuelve todos los settings como objeto { key: value }
router.get('/', async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany();
    const result = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/settings/:key - Devuelve un setting específico
router.get('/:key', async (req, res, next) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: req.params.key },
    });
    if (!setting) {
      return res.status(404).json({ error: 'Setting no encontrado' });
    }
    res.json({ [setting.key]: setting.value });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings - Actualiza uno o más settings { key: value }
router.put('/', async (req, res, next) => {
  try {
    const updates = req.body; // { key1: value1, key2: value2 }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Body inválido' });
    }

    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron settings para actualizar' });
    }

    // Update or create each setting
    const results = await Promise.all(
      keys.map(key =>
        prisma.setting.upsert({
          where: { key },
          update: { value: updates[key] },
          create: { key, value: updates[key] },
        })
      )
    );

    // Return all settings as object
    const allSettings = await prisma.setting.findMany();
    const result = {};
    for (const s of allSettings) {
      result[s.key] = s.value;
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;