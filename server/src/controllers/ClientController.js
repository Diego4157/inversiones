const { PrismaClient } = require('@prisma/client');
const { recordAuditLog } = require('../utils/auditLogger');
const prisma = new PrismaClient();

const ClientController = {
  // Obtener todos los clientes con sus préstamos e historial de adiciones
  async getAllClients(req, res) {
    try {
      const clients = await prisma.client.findMany({
        include: {
          loans: {
            include: {
              additions: { orderBy: { createdAt: 'desc' } },
              payments: { orderBy: { paymentDate: 'desc' } }
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Crear un nuevo cliente
  async createClient(req, res) {
    const { fullName, documentId, phone, address, status } = req.body;
    try {
      if (documentId) {
        const existing = await prisma.client.findUnique({
          where: { documentId: documentId }
        });
        if (existing) {
          return res.status(400).json({ error: "El documento ya está registrado" });
        }
      }

      const client = await prisma.client.create({
        data: {
          fullName,
          documentId: documentId || ("ID-" + Date.now()),
          phone: phone || "",
          address: address || "",
          status: status || 'ACTIVE'
        },
        include: { loans: true }
      });
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ error: error.message });
    }
  },
  
  // Actualizar un cliente (información general o estado: ACTIVE, CONGELADO, CASTIGADO, INACTIVE)
  async updateClient(req, res) {
    const { id } = req.params;
    const { fullName, documentId, phone, address, status } = req.body;
    const clientId = parseInt(id);

    try {
      if (documentId) {
        const existing = await prisma.client.findFirst({
          where: { 
            documentId: documentId,
            id: { not: clientId }
          }
        });
        if (existing) {
          return res.status(400).json({ error: "El documento ya está registrado en otro cliente" });
        }
      }

      const updateData = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (documentId !== undefined) updateData.documentId = documentId;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (status !== undefined) updateData.status = status;

      const client = await prisma.client.update({
        where: { id: clientId },
        data: updateData,
        include: { loans: true }
      });

      // Si el estado del cliente cambia a CONGELADO o CASTIGADO, sincronizamos sus créditos activos
      if (status === 'CONGELADO' || status === 'CASTIGADO') {
        await prisma.loan.updateMany({
          where: { clientId: clientId, status: { in: ['ACTIVE', 'MORA'] } },
          data: { status: status }
        });
      } else if (status === 'ACTIVE') {
        // Al reactivar el cliente, reactivamos los créditos que estaban congelados o castigados
        await prisma.loan.updateMany({
          where: { clientId: clientId, status: { in: ['CONGELADO', 'CASTIGADO'] } },
          data: { status: 'ACTIVE' }
        });
      }

      if (status) {
        let action = 'ACTUALIZAR_CLIENTE';
        if (status === 'CONGELADO') action = 'CONGELAR_CLIENTE';
        else if (status === 'CASTIGADO') action = 'CASTIGAR_CLIENTE';
        else if (status === 'ACTIVE') action = 'REACTIVAR_CLIENTE';

        await recordAuditLog({
          userId: req.user?.id,
          action,
          details: {
            clientId: client.id,
            clientName: client.fullName,
            newStatus: status
          },
          req
        });
      }

      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Cambiar estado rápido del cliente (endpoint de conveniencia)
  async updateStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body; // ACTIVE, CONGELADO, CASTIGADO, INACTIVE
    const clientId = parseInt(id);

    try {
      const client = await prisma.client.update({
        where: { id: clientId },
        data: { status },
        include: { loans: true }
      });

      if (status === 'CONGELADO' || status === 'CASTIGADO') {
        await prisma.loan.updateMany({
          where: { clientId: clientId, status: { in: ['ACTIVE', 'MORA'] } },
          data: { status: status }
        });
      } else if (status === 'ACTIVE') {
        await prisma.loan.updateMany({
          where: { clientId: clientId, status: { in: ['CONGELADO', 'CASTIGADO'] } },
          data: { status: 'ACTIVE' }
        });
      }

      let action = 'ACTUALIZAR_CLIENTE';
      if (status === 'CONGELADO') action = 'CONGELAR_CLIENTE';
      else if (status === 'CASTIGADO') action = 'CASTIGAR_CLIENTE';
      else if (status === 'ACTIVE') action = 'REACTIVAR_CLIENTE';

      await recordAuditLog({
        userId: req.user?.id,
        action,
        details: {
          clientId: client.id,
          clientName: client.fullName,
          newStatus: status
        },
        req
      });

      res.json({ message: `Estado actualizado a ${status}`, client });
    } catch (error) {
      console.error("Error updating client status:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar un cliente y sus registros dependientes
  async deleteClient(req, res) {
    const { id } = req.params;
    const clientId = parseInt(id);
    try {
      const loans = await prisma.loan.findMany({
        where: { clientId }
      });
      const loanIds = loans.map(l => l.id);

      await prisma.$transaction([
        prisma.payment.deleteMany({
          where: { loanId: { in: loanIds } }
        }),
        prisma.paymentPromise.deleteMany({
          where: { loanId: { in: loanIds } }
        }),
        prisma.scheduledReceipt.deleteMany({
          where: { loanId: { in: loanIds } }
        }),
        prisma.refinanceHistory.deleteMany({
          where: { loanId: { in: loanIds } }
        }),
        prisma.loanAddition.deleteMany({
          where: { loanId: { in: loanIds } }
        }),
        prisma.loan.deleteMany({
          where: { clientId }
        }),
        prisma.client.delete({
          where: { id: clientId }
        })
      ]);

      res.json({ message: "Cliente y todos sus datos asociados fueron eliminados." });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = ClientController;
