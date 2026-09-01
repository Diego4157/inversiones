const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ReportController = {
  // Cuadre final del día
  async getDailySummary(req, res) {
    const { date } = req.query;
    try {
      const parsedDate = new Date(date);
      const startDate = new Date(date);
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setUTCHours(23, 59, 59, 999);

      // Sumar cobros reales registrados en la tabla Payment
      const payments = await prisma.payment.findMany({
        where: {
          paymentDate: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const receipts = await prisma.scheduledReceipt.findMany({
        where: { date: parsedDate }
      });

      let totalCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0);
      let totalPending = 0;
      let totalAtrasosCount = 0;
      let totalDominicalesCount = 0;

      let totalCash = 0;
      let totalNequi = 0;
      let totalDaviplata = 0;
      let totalDigital = 0;

      payments.forEach(p => {
        const amt = Number(p.amount);
        const cashAmt = p.cashAmount ? Number(p.cashAmount) : 0;
        const digAmt = p.digitalAmount ? Number(p.digitalAmount) : 0;

        if (p.paymentMethod === 'EFECTIVO') {
          totalCash += amt;
        } else if (p.paymentMethod === 'NEQUI') {
          totalNequi += amt;
          totalDigital += amt;
        } else if (p.paymentMethod === 'DAVIPLATA') {
          totalDaviplata += amt;
          totalDigital += amt;
        } else if (p.paymentMethod === 'MIXTO') {
          totalCash += cashAmt;
          totalDigital += digAmt;
        }
      });

      receipts.forEach(r => {
        if (r.status === 'PENDING') {
          totalPending += Number(r.expectedAmount);
        } else if (r.status === 'ATRASADO') {
          totalAtrasosCount++;
        } else if (r.status === 'DOMINICAL') {
          totalDominicalesCount++;
        }
      });

      res.json({
        date,
        totalCollected,
        totalPending,
        totalAtrasosCount,
        totalDominicalesCount,
        receiptsCount: receipts.length,
        totalCash,
        totalNequi,
        totalDaviplata,
        totalDigital,
        totalPaidCount: payments.length
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = ReportController;
