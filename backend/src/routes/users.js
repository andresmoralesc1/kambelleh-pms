import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren authenticate + authorize('ADMIN')
router.use(authenticate, authorize('ADMIN'));

// GET /api/users - Lista todos los usuarios
router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: { reservationsCreated: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id - Detalle de un usuario
router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: { reservationsCreated: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/users - Crear usuario
router.post('/', async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'El email, la contraseña y el nombre son obligatorios' });
    }

    // Validar rol
    const validRoles = ['ADMIN', 'MANAGER', 'RECEPTIONIST'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Rol inválido. Roles válidos: ADMIN, MANAGER, RECEPCIONIST' });
    }

    // Validar email único
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // Hashear password con bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role || 'RECEPTIONIST',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id - Actualizar usuario (sin cambiar password)
router.put('/:id', async (req, res, next) => {
  try {
    const { name, email, role } = req.body;

    // Obtener usuario actual
    const currentUser = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!currentUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Validar email único (excepto el propio)
    if (email && email !== currentUser.email) {
      const existingWithEmail = await prisma.user.findUnique({ where: { email } });
      if (existingWithEmail) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }
    }

    // No permitir que el último ADMIN se elimine o cambie de rol
    if (currentUser.role === 'ADMIN' && role && role !== 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        return res.status(409).json({ error: 'No se puede cambiar el rol del último administrador' });
      }
    }

    // Validar rol
    const validRoles = ['ADMIN', 'MANAGER', 'RECEPTIONIST'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Rol inválido. Roles válidos: ADMIN, MANAGER, RECEPCIONIST' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        name: name || currentUser.name,
        email: email || currentUser.email,
        role: role || currentUser.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id - Eliminar usuario
router.delete('/:id', async (req, res, next) => {
  try {
    // No permitir eliminarse a sí mismo
    if (req.params.id === req.user.id) {
      return res.status(409).json({ error: 'No puedes eliminarte a ti mismo' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // No permitir eliminar al último ADMIN
    if (user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        return res.status(409).json({ error: 'No se puede eliminar al último administrador' });
      }
    }

    // Eliminar en cascada sus refresh tokens (ya configurado en el schema con onDelete: Cascade)
    await prisma.user.delete({ where: { id: req.params.id } });

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/password - Cambiar password propio (sin authorize global porque solo el propio usuario puede)
router.patch('/:id/password', authenticate, async (req, res, next) => {
  try {
    // Solo el propio usuario puede cambiar su password
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ error: 'Solo puedes cambiar tu propia contraseña' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'La contraseña actual y la nueva contraseña son obligatorias' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }

    // Obtener usuario con password hash
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Validar currentPassword con bcrypt.compare
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    // Hashear nuevo password con bcrypt.hash(password, 12)
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidar todos los refresh tokens existentes (logout de todos los dispositivos)
    await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });

    res.json({ message: 'Contraseña cambiada correctamente. Por favor, inicia sesión nuevamente.' });
  } catch (err) {
    next(err);
  }
});

export default router;