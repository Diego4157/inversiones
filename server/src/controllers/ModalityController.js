const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ModalityController = {
  // Obtener todas las modalidades
  async getAll(req, res) {
    try {
      const modalities = await prisma.loanModality.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(modalities);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Crear una nueva modalidad
  async create(req, res) {
    const { name, frequency, interestRate, installments } = req.body;
    try {
      const modality = await prisma.loanModality.create({
        data: {
          name,
          frequency,
          interestRate: parseFloat(interestRate),
          installments: parseInt(installments)
        }
      });
      res.status(201).json(modality);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar una modalidad
  async delete(req, res) {
    const { id } = req.params;
    try {
      await prisma.loanModality.delete({
        where: { id: parseInt(id) }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = ModalityController;
