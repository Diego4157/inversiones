const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PaymentController = {
  // Registrar un nuevo pago/abono
  async recordPayment(req, res) {
    const { loanId, amount, collectorId } = req.body;
    console.log(`>> Intentando registrar pago de $${amount} para el préstamo ID: ${loanId}`);

    try {
      // 1. Buscamos el préstamo para ver el saldo actual
      const loan = await prisma.loan.findUnique({
        where: { id: parseInt(loanId) }
      });

      if (!loan) {
        return res.status(404).json({ error: 'Préstamo no encontrado' });
      }

      const previousBalance = parseFloat(loan.balance);
      const paymentAmount = parseFloat(amount);
      const newBalance = previousBalance - paymentAmount;

      // 2. Creamos el registro del pago
      const payment = await prisma.payment.create({
        data: {
          loanId: parseInt(loanId),
          collectorId: collectorId || 1, // Por defecto administrador
          amount: paymentAmount,
          previousBalance: previousBalance,
          newBalance: newBalance,
          arrearsCount: 0 // Lógica de mora se puede añadir luego
        }
      });

      // 3. Actualizamos el saldo del préstamo
      await prisma.loan.update({
        where: { id: parseInt(loanId) },
        data: {
          balance: newBalance,
          installmentsPaid: { increment: 1 }
        }
      });

      console.log(`>> ¡ÉXITO! Nuevo saldo para el préstamo: $${newBalance}`);
      res.status(201).json(payment);
    } catch (error) {
      console.error("!! Error al registrar pago:", error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = PaymentController;
