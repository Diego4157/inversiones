const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const InvestorController = {
  // Obtener todos los inversionistas con sus transacciones
  async getAllInvestors(req, res) {
    try {
      const investors = await prisma.investor.findMany({
        include: {
          transactions: {
            orderBy: { transactionDate: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(investors);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Registrar un nuevo inversionista
  async createInvestor(req, res) {
    const { fullName, initialCapital, profitRate, paymentFrequency, nextPayoutDate } = req.body;
    try {
      const amount = initialCapital ? parseFloat(initialCapital) : 0;
      
      const investor = await prisma.investor.create({
        data: {
          fullName,
          totalCapital: amount,
          profitRate: profitRate ? parseFloat(profitRate) : 0,
          paymentFrequency: paymentFrequency || 'MONTHLY',
          nextPayoutDate: nextPayoutDate ? new Date(nextPayoutDate) : null
        }
      });

      // Si hay capital inicial, registrar la transacción correspondiente
      if (amount > 0) {
        await prisma.investorTransaction.create({
          data: {
            investorId: investor.id,
            amount: amount,
            type: 'CONTRIBUTION'
          }
        });
      }

      res.status(201).json(investor);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar un inversionista (su margen de ganancias o fecha de pago)
  async updateInvestor(req, res) {
    const { id } = req.params;
    const { fullName, profitRate, paymentFrequency, nextPayoutDate } = req.body;
    try {
      const parsedId = parseInt(id);
      const data = {};
      if (fullName !== undefined) data.fullName = fullName;
      if (profitRate !== undefined) data.profitRate = parseFloat(profitRate);
      if (paymentFrequency !== undefined) data.paymentFrequency = paymentFrequency;
      if (nextPayoutDate !== undefined) data.nextPayoutDate = nextPayoutDate ? new Date(nextPayoutDate) : null;

      const updated = await prisma.investor.update({
        where: { id: parsedId },
        data
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Registrar una transacción de capital
  async addTransaction(req, res) {
    const { investorId, amount, type } = req.body; // type: CONTRIBUTION, WITHDRAWAL, PROFIT_SHARE
    try {
      const parsedAmount = parseFloat(amount);
      const parsedInvestorId = parseInt(investorId);

      // Calcular nuevo balance de capital
      const investor = await prisma.investor.findUnique({
        where: { id: parsedInvestorId }
      });

      if (!investor) {
        return res.status(404).json({ error: 'Inversionista no encontrado' });
      }

      let newCapital = Number(investor.totalCapital);
      if (type === 'CONTRIBUTION') {
        newCapital += parsedAmount;
      } else if (type === 'WITHDRAWAL') {
        if (newCapital < parsedAmount) {
          return res.status(400).json({ error: 'Retiro supera el capital disponible del inversionista' });
        }
        newCapital -= parsedAmount;
      }

      // Actualizar el capital total del inversionista y registrar transacción
      await prisma.investor.update({
        where: { id: parsedInvestorId },
        data: { totalCapital: newCapital }
      });

      const transaction = await prisma.investorTransaction.create({
        data: {
          investorId: parsedInvestorId,
          amount: parsedAmount,
          type
        }
      });

      res.status(201).json(transaction);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = InvestorController;
