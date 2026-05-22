import { prisma } from './prisma.js';

export async function audit(req, action, data = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action,
        entityType: data.entityType,
        entityId: data.entityId,
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'] || '',
        details: data.details || {}
      }
    });
  } catch (err) {
    console.error('[audit] falha:', err.message);
  }
}
