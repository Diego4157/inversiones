const { PrismaClient } = require('@prisma/client');
const { recordAuditLog } = require('../utils/auditLogger');
const prisma = new PrismaClient();

const PaymentController = {
  // Registrar un nuevo pago/abono
  async recordPayment(req, res) {
    const { loanId, amount, collectorId, paymentMethod, cashAmount, digitalAmount } = req.body;
    console.log(`>> Intentando registrar pago de $${amount} para el préstamo ID: ${loanId}`);

    try {
      const todayString = new Date().toISOString().split('T')[0];
      const isClosed = await prisma.systemSetting.findUnique({
        where: { key: `closed_route_${todayString}` }
      });
      if (isClosed && isClosed.value === 'true') {
        return res.status(403).json({ error: `Operación bloqueada (403). La caja del día ${todayString} ya está cerrada permanentemente.` });
      }

      // 1. Buscamos el préstamo para ver el saldo actual
      const loan = await prisma.loan.findUnique({
        where: { id: parseInt(loanId) },
        include: { client: true }
      });

      if (!loan) {
        return res.status(404).json({ error: 'Préstamo no encontrado' });
      }

      const previousBalance = parseFloat(loan.balance);
      const paymentAmount = parseFloat(amount);
      const newBalance = Math.max(0, previousBalance - paymentAmount);

      const pMethod = paymentMethod || 'EFECTIVO';
      const cAmount = cashAmount !== undefined && cashAmount !== null
        ? parseFloat(cashAmount)
        : (pMethod === 'EFECTIVO' ? paymentAmount : 0);
      const dAmount = digitalAmount !== undefined && digitalAmount !== null
        ? parseFloat(digitalAmount)
        : (['NEQUI', 'DAVIPLATA', 'TRANSFERENCIA'].includes(pMethod) ? paymentAmount : 0);

      // 2. Creamos el registro del pago
      const payment = await prisma.payment.create({
        data: {
          loanId: parseInt(loanId),
          collectorId: req.user?.id || collectorId || 1,
          amount: paymentAmount,
          paymentMethod: pMethod,
          cashAmount: cAmount,
          digitalAmount: dAmount,
          previousBalance: previousBalance,
          newBalance: newBalance,
          arrearsCount: 0
        }
      });

      // 3. Actualizamos el saldo del préstamo
      await prisma.loan.update({
        where: { id: parseInt(loanId) },
        data: {
          balance: newBalance,
          installmentsPaid: { increment: 1 },
          status: newBalance <= 0 ? 'FINALIZADO' : loan.status
        }
      });

      // 4. Bitácora de Auditoría
      await recordAuditLog({
        userId: req.user?.id || collectorId || 1,
        action: 'ABONO_PAGO',
        details: {
          paymentId: payment.id,
          loanId: loan.id,
          clientId: loan.clientId,
          clientName: loan.client?.fullName,
          amount: paymentAmount,
          paymentMethod: pMethod,
          cashAmount: cAmount,
          digitalAmount: dAmount,
          previousBalance: previousBalance,
          newBalance: newBalance
        },
        req
      });

      console.log(`>> ¡ÉXITO! Nuevo saldo para el préstamo: $${newBalance}`);
      res.status(201).json(payment);
    } catch (error) {
      console.error("!! Error al registrar pago:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Anular un pago específico y restaurar el saldo del crédito
  async voidPayment(req, res) {
    const { id } = req.params;
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: parseInt(id) },
        include: { loan: { include: { client: true } } }
      });

      if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });

      const dateString = payment.paymentDate ? payment.paymentDate.toISOString().split('T')[0] : null;
      if (dateString) {
        const isClosed = await prisma.systemSetting.findUnique({
          where: { key: `closed_route_${dateString}` }
        });
        if (isClosed && isClosed.value === 'true') {
          return res.status(403).json({ error: `Operación bloqueada. La caja del día ${dateString} ya está cerrada permanentemente.` });
        }
      }

      const restoredBalance = Number(payment.loan.balance) + Number(payment.amount);
      const cuotaVal = Number(payment.loan.totalAmount) / (payment.loan.installmentsTotal || 20);
      const paidCount = Math.max(1, Math.round(Number(payment.amount) / cuotaVal));
      const restoredInstallments = Math.max(0, payment.loan.installmentsPaid - paidCount);

      await prisma.loan.update({
        where: { id: payment.loanId },
        data: {
          balance: restoredBalance,
          installmentsPaid: restoredInstallments,
          status: restoredBalance > 0 ? 'ACTIVE' : payment.loan.status
        }
      });

      if (dateString) {
        const receipt = await prisma.scheduledReceipt.findFirst({
          where: {
            loanId: payment.loanId,
            date: new Date(dateString)
          }
        });
        if (receipt && receipt.status === 'PAID') {
          await prisma.scheduledReceipt.update({
            where: { id: receipt.id },
            data: { status: 'PENDING' }
          });
        }
      }

      await prisma.payment.delete({ where: { id: parseInt(id) } });

      await recordAuditLog({
        userId: req.user?.id || 1,
        action: 'ANULACION_PAGO',
        details: {
          paymentId: payment.id,
          loanId: payment.loanId,
          clientId: payment.loan.clientId,
          clientName: payment.loan.client?.fullName,
          amountReversed: Number(payment.amount),
          restoredBalance
        },
        req
      });

      res.json({ message: 'Pago anulado exitosamente y saldo restaurado', restoredBalance, restoredInstallments });
    } catch (error) {
      console.error("Error al anular pago:", error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = PaymentController;
