const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const AuditController = {
  // Obtener los últimos registros de auditoría
  async getAuditLogs(req, res) {
    const { limit = 100, action } = req.query;

    try {
      const where = {};
      if (action && action !== 'ALL') {
        where.action = action;
      }

      const logs = await prisma.auditLog.findMany({
        where,
        take: parseInt(limit) || 100,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });

      res.json(logs);
    } catch (error) {
      console.error('Error al obtener registros de auditoría:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = AuditController;
