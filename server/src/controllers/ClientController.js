const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ClientController = {
  // Get all clients
  async getAllClients(req, res) {
    try {
      const clients = await prisma.client.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Create a new client
  async createClient(req, res) {
    const { fullName, documentId, phone, address } = req.body;
    try {
      // Validate if a client with the same document already exists
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
          status: 'ACTIVE'
        }
      });
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ error: error.message });
    }
  },
  
  // Update a client
  async updateClient(req, res) {
    const { id } = req.params;
    const { fullName, documentId, phone, address } = req.body;
    try {
      // Validate if a client with the same document already exists (excluding this one)
      if (documentId) {
        const existing = await prisma.client.findFirst({
          where: { 
            documentId: documentId,
            id: { not: parseInt(id) }
          }
        });
        if (existing) {
          return res.status(400).json({ error: "El documento ya está registrado en otro cliente" });
        }
      }

      const client = await prisma.client.update({
        where: { id: parseInt(id) },
        data: {
          fullName,
          documentId,
          phone,
          address
        }
      });
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Delete a client
  async deleteClient(req, res) {
    const { id } = req.params;
    const clientId = parseInt(id);
    try {
      // Find all loans of this client
      const loans = await prisma.loan.findMany({
        where: { clientId }
      });
      const loanIds = loans.map(l => l.id);

      await prisma.$transaction([
        // Delete payments
        prisma.payment.deleteMany({
          where: { loanId: { in: loanIds } }
        }),
        // Delete promises
        prisma.paymentPromise.deleteMany({
          where: { loanId: { in: loanIds } }
        }),
        // Delete scheduled receipts
        prisma.scheduledReceipt.deleteMany({
          where: { loanId: { in: loanIds } }
        }),
        // Delete refinance history
        prisma.refinanceHistory.deleteMany({
          where: { loanId: { in: loanIds } }
        }),
        // Delete loans
        prisma.loan.deleteMany({
          where: { clientId }
        }),
        // Delete client
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
