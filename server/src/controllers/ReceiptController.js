const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ReceiptController = {
  // Generar ruta del día
  async generateDailyRoute(req, res) {
    const { date } = req.body;
    try {
      const parsedDate = new Date(date);
      const dateString = date.split('T')[0];

      // 1. Verificar si la ruta para esta fecha ya está cerrada
      const isClosedSetting = await prisma.systemSetting.findUnique({
        where: { key: `closed_route_${dateString}` }
      });
      if (isClosedSetting && isClosedSetting.value === 'true') {
        return res.status(400).json({ error: "La ruta de este día ya está cerrada y cuadradada. No puedes volver a generarla." });
      }

      // 2. Verificar si hay algún recibo PENDING con fecha anterior a parsedDate
      const pendingBefore = await prisma.scheduledReceipt.findFirst({
        where: {
          date: { lt: parsedDate },
          status: 'PENDING'
        }
      });
      if (pendingBefore) {
        const pendingDateString = pendingBefore.date.toISOString().split('T')[0];
        return res.status(400).json({ 
          error: `No se puede generar la ruta. Existen cobros PENDIENTES del día ${pendingDateString}. Debes cuadrarlos o reprogramarlos primero.` 
        });
      }

      // Obtener todos los préstamos activos excluyendo congelados y castigados
      const activeLoans = await prisma.loan.findMany({
        where: { 
          status: 'ACTIVE',
          client: {
            status: { notIn: ['CONGELADO', 'CASTIGADO', 'INACTIVE'] }
          }
        },
        include: { client: true }
      });

      let generatedCount = 0;

      for (const loan of activeLoans) {
        // Verificar si ya existe un recibo para hoy
        const existing = await prisma.scheduledReceipt.findFirst({
          where: {
            loanId: loan.id,
            date: parsedDate
          }
        });

        if (!existing) {
          // Lógica de frecuencia (simplificada para generar siempre en esta demo, o podrías comprobar si es lunes, etc.)
          let shouldGenerate = true;
          
          if (loan.frequency === 'WEEKLY') {
            // Generar solo si coincide el día de la semana con el de la creación u otra lógica
            // Por simplicidad en la base de esta versión, la generamos si se manda desde la ruta manual, o asume que debe generarse.
            // Para ser exactos, habría que validar el día de pago. Lo dejamos true por ahora y se filtra.
          }

          if (shouldGenerate) {
             // Calcular cuota (si es diario: total/20, pero usaremos total/installmentsTotal)
            const cuota = Number(loan.totalAmount) / loan.installmentsTotal;
            await prisma.scheduledReceipt.create({
              data: {
                loanId: loan.id,
                date: parsedDate,
                expectedAmount: cuota,
                status: 'PENDING',
                isManual: false
              }
            });
            generatedCount++;
          }
        }
      }

      res.json({ message: `Ruta generada. ${generatedCount} recibos nuevos creados.` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener ruta de un día
  async getRouteByDate(req, res) {
    const { date } = req.query;
    try {
      const receipts = await prisma.scheduledReceipt.findMany({
        where: { date: new Date(date) },
        include: {
          loan: {
            include: { 
              client: true,
              payments: {
                orderBy: { createdAt: 'desc' },
                take: 1
              },
              scheduledReceipts: {
                where: { status: 'DOMINICAL' }
              }
            }
          }
        }
      });
      res.json(receipts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Cambiar estado de recibo
  async updateReceiptStatus(req, res) {
    const { id } = req.params;
    const { status, amountPaid, paymentMethod, cashAmount, digitalAmount, nextPaymentDate } = req.body; // status: PAID, ATRASADO, DOMINICAL
    try {
      const receipt = await prisma.scheduledReceipt.findUnique({
        where: { id: parseInt(id) },
        include: { loan: true }
      });

      if (!receipt) return res.status(404).json({ error: 'Recibo no encontrado' });

      let newBalance = Number(receipt.loan.balance);
      let atrasos = receipt.loan.atrasosAcumulados;
      let installmentsPaid = receipt.loan.installmentsPaid;
      const amountToDeduct = amountPaid !== undefined ? Number(amountPaid) : Number(receipt.expectedAmount);

      if (status === 'PAID') {
        newBalance -= amountToDeduct;
        const cuotaVal = Number(receipt.expectedAmount) > 0 ? Number(receipt.expectedAmount) : 1;
        const paidCount = Math.max(1, Math.round(amountToDeduct / cuotaVal));
        installmentsPaid += paidCount;
        
        // Registrar el pago en la tabla Payment para el cuadre
        await prisma.payment.create({
          data: {
            loanId: receipt.loan.id,
            collectorId: 1, // HARDCODED for now
            amount: amountToDeduct,
            paymentMethod: paymentMethod || 'EFECTIVO',
            cashAmount: cashAmount ? Number(cashAmount) : null,
            digitalAmount: digitalAmount ? Number(digitalAmount) : null,
            previousBalance: Number(receipt.loan.balance),
            newBalance: newBalance,
            arrearsCount: atrasos
          }
        });

      } else if (status === 'ATRASADO') {
        atrasos += 1;
        if (atrasos >= 3) {
          // Aplicar Mora
          const cuota = Number(receipt.loan.totalAmount) / receipt.loan.installmentsTotal;
          const moraFee = cuota / 3; 
          newBalance += moraFee;
          atrasos = 0; // Resetear contador
        }
      }

      let loanStatus = receipt.loan.status;
      if (newBalance <= 0) {
        newBalance = 0;
        loanStatus = 'FINALIZADO';
      }

      // Update Loan
      const updatedLoan = await prisma.loan.update({
        where: { id: receipt.loan.id },
        data: {
          balance: newBalance,
          atrasosAcumulados: atrasos,
          installmentsPaid: installmentsPaid,
          status: loanStatus
        }
      });

      // Update Receipt
      const updated = await prisma.scheduledReceipt.update({
        where: { id: parseInt(id) },
        data: { status }
      });

      // Si el crédito sigue activo y hay una fecha de próximo cobro, programar el siguiente recibo
      if (loanStatus !== 'FINALIZADO' && nextPaymentDate) {
        const parsedNextDate = new Date(nextPaymentDate);
        
        // Recalcular la cuota: saldo restante dividido entre las cuotas que quedan
        const remainingInstallments = updatedLoan.installmentsTotal - updatedLoan.installmentsPaid;
        const newCuota = remainingInstallments > 0 ? (newBalance / remainingInstallments) : newBalance;

        // Verificar si ya existe un recibo para esa fecha
        const existingNext = await prisma.scheduledReceipt.findFirst({
          where: {
            loanId: receipt.loan.id,
            date: parsedNextDate
          }
        });

        if (!existingNext) {
          await prisma.scheduledReceipt.create({
            data: {
              loanId: receipt.loan.id,
              date: parsedNextDate,
              expectedAmount: newCuota,
              status: 'PENDING',
              isManual: false
            }
          });
        } else {
          await prisma.scheduledReceipt.update({
            where: { id: existingNext.id },
            data: { expectedAmount: newCuota }
          });
        }
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Crear recibo manual
  async createManualReceipt(req, res) {
    const { loanId, date } = req.body;
    try {
      const loan = await prisma.loan.findUnique({ where: { id: parseInt(loanId) }});
      const cuota = Number(loan.totalAmount) / loan.installmentsTotal;
      
      const receipt = await prisma.scheduledReceipt.create({
        data: {
          loanId: parseInt(loanId),
          date: new Date(date),
          expectedAmount: cuota,
          status: 'PENDING',
          isManual: true
        }
      });
      res.json(receipt);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Declarar Día Cívico
  async declareCivicDay(req, res) {
    const { date } = req.body;
    try {
      const parsedDate = new Date(date);
      // Mover los pendientes al día siguiente y cambiar el estado
      await prisma.scheduledReceipt.updateMany({
        where: { date: parsedDate, status: 'PENDING' },
        data: { status: 'CONGELADO' } // Or keep it pending but date shifted. Let's shift date:
      });
      
      // La forma más fácil es cambiarles la fecha al día siguiente para que aparezcan mañana en vez de hoy
      const nextDay = new Date(parsedDate);
      nextDay.setDate(nextDay.getDate() + 1);

      await prisma.scheduledReceipt.updateMany({
        where: { date: parsedDate, status: 'PENDING' },
        data: { date: nextDay }
      });

      res.json({ success: true, message: "Día declarado Cívico. Los cobros pendientes pasaron a mañana." });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Cerrar y cuadrar la ruta de un día
  async closeRoute(req, res) {
    const { date } = req.body;
    try {
      const parsedDate = new Date(date);
      const dateString = date.split('T')[0];

      // Verificar si hay cobros PENDING para este día
      const pendingCount = await prisma.scheduledReceipt.count({
        where: {
          date: parsedDate,
          status: 'PENDING'
        }
      });

      if (pendingCount > 0) {
        return res.status(400).json({ error: `No se puede cerrar la ruta. Quedan ${pendingCount} cobros pendientes por cuadrar para este día.` });
      }

      // Marcar como cerrada usando SystemSetting
      await prisma.systemSetting.upsert({
        where: { key: `closed_route_${dateString}` },
        update: { value: 'true' },
        create: { key: `closed_route_${dateString}`, value: 'true' }
      });

      res.json({ success: true, message: `La ruta del día ${dateString} ha sido cerrada y cuadrada oficialmente.` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Verificar si la ruta de un día está cerrada
  async isRouteClosed(req, res) {
    const { date } = req.query;
    try {
      const dateString = date.split('T')[0];
      const setting = await prisma.systemSetting.findUnique({
        where: { key: `closed_route_${dateString}` }
      });
      res.json({ closed: setting ? setting.value === 'true' : false });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Verificar el estado general de la ruta (cerrada, generada, cobros pendientes)
  async checkRouteStatus(req, res) {
    const { date } = req.query;
    try {
      const parsedDate = new Date(date);
      const dateString = date.split('T')[0];

      // 1. Verificar si está cerrada
      const isClosedSetting = await prisma.systemSetting.findUnique({
        where: { key: `closed_route_${dateString}` }
      });
      const isClosed = isClosedSetting ? isClosedSetting.value === 'true' : false;

      // 2. Verificar si está generada (si hay algún recibo para hoy)
      const countToday = await prisma.scheduledReceipt.count({
        where: { date: parsedDate }
      });
      const isGenerated = countToday > 0;

      // 3. Contar pendientes hoy
      const pendingToday = await prisma.scheduledReceipt.count({
        where: { date: parsedDate, status: 'PENDING' }
      });

      // 4. Buscar el primer pendiente antes de hoy
      const pendingBefore = await prisma.scheduledReceipt.findFirst({
        where: {
          date: { lt: parsedDate },
          status: 'PENDING'
        },
        orderBy: { date: 'asc' }
      });

      res.json({
        isClosed,
        isGenerated,
        pendingToday,
        hasPendingBefore: !!pendingBefore,
        pendingBeforeDate: pendingBefore ? pendingBefore.date.toISOString().split('T')[0] : null
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = ReceiptController;
