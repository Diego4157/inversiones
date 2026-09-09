const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Registra un movimiento o evento crítico en la bitácora de auditoría del sistema
 * @param {Object} params
 * @param {number|null} [params.userId] - ID del usuario que ejecuta la acción
 * @param {string} params.action - Nombre de la acción (CREAR_CREDITO, ABONO_PAGO, AGREGAR_CAPITAL, CONGELAR_CLIENTE, CIERRE_CAJA, etc.)
 * @param {Object|string} params.details - Detalles estructurados de la operación (valores anteriores, nuevos, etc.)
 * @param {Object} [params.req] - Objeto Request de Express
 */
async function recordAuditLog({ userId, action, details, req }) {
  try {
    const finalUserId = userId || (req && req.user && req.user.id) || null;
    
    let ipAddress = null;
    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || null;
      if (typeof ipAddress === 'string' && ipAddress.includes(',')) {
        ipAddress = ipAddress.split(',')[0].trim();
      }
    }

    let validUserId = null;
    if (finalUserId) {
      const userExists = await prisma.user.findUnique({
        where: { id: parseInt(finalUserId) }
      });
      if (userExists) {
        validUserId = userExists.id;
      }
    }

    const finalDetails = typeof details === 'object' ? JSON.stringify(details) : String(details || '');

    const log = await prisma.auditLog.create({
      data: {
        userId: validUserId,
        action,
        details: finalDetails,
        ipAddress
      }
    });

    return log;
  } catch (err) {
    console.error('!! Advertencia: Fallo al registrar AuditLog:', err.message);
    return null;
  }
}

module.exports = { recordAuditLog };
