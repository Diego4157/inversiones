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
      console.error("Error fetching investors:", error);
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
      console.error("Error creating investor:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar un inversionista
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
      console.error("Error updating investor:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Registrar una transacción de capital
  async addTransaction(req, res) {
    const { investorId, amount, type } = req.body; // type: CONTRIBUTION, WITHDRAWAL, PROFIT_SHARE
    try {
      const parsedAmount = parseFloat(amount);
      const parsedInvestorId = parseInt(investorId);

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
      console.error("Error adding investor transaction:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Liquidación mensual de inversionistas sobre Recaudo Real (Tabla Payment - Gastos Operativos)
  async calculateSettlement(req, res) {
    const { startDate, endDate, operationalExpenses } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Debes proporcionar una fecha inicial y fecha final (startDate y endDate)' });
    }

    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // 1. Obtener los pagos efectivamente recaudados en el rango de fechas
      const payments = await prisma.payment.findMany({
        where: {
          paymentDate: {
            gte: start,
            lte: end
          }
        }
      });

      const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0);
      const expenses = operationalExpenses ? parseFloat(operationalExpenses) : 0;
      
      // 2. Base neta para liquidar utilidades: Recaudo Real - Gastos Operativos
      const netBase = Math.max(0, totalCollected - expenses);

      // 3. Obtener socios y calcular el capital total
      const investors = await prisma.investor.findMany({
        orderBy: { id: 'asc' }
      });

      const totalCapitalPool = investors.reduce((sum, inv) => sum + Number(inv.totalCapital), 0);

      // 4. Calcular el rendimiento de cada socio en base a su % de participación
      const breakdown = investors.map(inv => {
        const capital = Number(inv.totalCapital);
        const equityShare = totalCapitalPool > 0 ? (capital / totalCapitalPool) : 0;
        const yieldReal = netBase * equityShare;
        const contractualYield = capital * (Number(inv.profitRate) / 100);

        return {
          investorId: inv.id,
          fullName: inv.fullName,
          totalCapital: capital,
          profitRateContractual: Number(inv.profitRate),
          participationPercentage: Number((equityShare * 100).toFixed(2)),
          yieldReal: Math.round(yieldReal),
          contractualYield: Math.round(contractualYield)
        };
      });

      res.json({
        startDate,
        endDate,
        paymentsCount: payments.length,
        totalCollected,
        operationalExpenses: expenses,
        netBase,
        totalCapitalPool,
        breakdown
      });
    } catch (error) {
      console.error("Error calculating investor settlement:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Asentar y registrar oficialmente la liquidación de utilidades
  async applySettlement(req, res) {
    const { startDate, endDate, operationalExpenses, settlements } = req.body;

    if (!Array.isArray(settlements) || settlements.length === 0) {
      return res.status(400).json({ error: 'No se enviaron datos de liquidación para procesar' });
    }

    try {
      const createdTxs = [];

      for (const item of settlements) {
        if (item.yieldAmount && Number(item.yieldAmount) > 0) {
          const tx = await prisma.investorTransaction.create({
            data: {
              investorId: parseInt(item.investorId),
              amount: Number(item.yieldAmount),
              type: 'PROFIT_SHARE'
            }
          });
          createdTxs.push(tx);
        }
      }

      res.status(201).json({
        message: `Liquidación completada. Se generaron ${createdTxs.length} repartos de utilidades oficiales.`,
        transactions: createdTxs
      });
    } catch (error) {
      console.error("Error applying investor settlement:", error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = InvestorController;
