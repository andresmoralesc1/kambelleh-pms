import prisma from '../config/database.js';

// Función para registrar actividades de usuario (fire-and-forget, no bloquea la request principal)
export function logActivity(userId, action, resource, resourceId = null, details = null, ipAddress = null) {
  // No await - fire and forget
  prisma.activityLog.create({
    data: {
      userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
    },
  }).catch(err => {
    console.error('Error al registrar actividad:', err.message);
  });
}

// Middleware para registrar requests automáticamente
export function auditLog(action, resource) {
  return (req, res, next) => {
    // Capturar IP del cliente
    const ipAddress = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    
    // Después de que la respuesta se envíe, registrar la actividad
    res.on('finish', () => {
      if (req.user && req.user.id) {
        const resourceId = req.params?.id || null;
        logActivity(
          req.user.id,
          action,
          resource,
          resourceId,
          {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
          },
          ipAddress
        );
      }
    });
    
    next();
  };
}