const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PaymentPromiseController = {
  // Crear promesa de pago
  async createPromise(req, res) {
    const { loanId, promiseDate, amountExpected } = req.body;
    try {
      const promise = await prisma.paymentPromise.create({
        data: {
          loanId: parseInt(loanId),
          promiseDate: new Date(promiseDate),
          amountExpected: Number(amountExpected),
          status: 'PENDING'
        }
      });
      res.status(201).json(promise);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener promesas de un día específico
  async getPromisesByDate(req, res) {
    const { date } = req.query;
    try {
      const parsedDate = new Date(date);
      const promises = await prisma.paymentPromise.findMany({
        where: { 
          promiseDate: parsedDate,
          status: 'PENDING'
        },
        include: {
          loan: {
            include: { client: true }
          }
        }
      });
      res.json(promises);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Marcar como cumplida o rota
  async updatePromiseStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body; // FULFILLED, BROKEN
    try {
      const promise = await prisma.paymentPromise.update({
        where: { id: parseInt(id) },
        data: { status }
      });
      res.json(promise);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = PaymentPromiseController;
