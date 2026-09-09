const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log(">> CONTROLADOR DE PRÉSTAMOS CARGADO (VERSIÓN 3.0 - ADICIÓN DE CAPITAL & REFINANCIACIÓN)");

const LoanController = {
  // Obtener todos los préstamos
  async getAllLoans(req, res) {
    console.log(">> Petición: Listar todos los préstamos.");
    try {
      const loans = await prisma.loan.findMany({
        include: { 
          client: true,
          additions: { orderBy: { createdAt: 'desc' } },
          payments: { orderBy: { paymentDate: 'desc' } }
        },
        orderBy: { createdAt: 'desc' }
      });
      console.log(`>> Enviando ${loans.length} préstamos al cliente.`);
      res.json(loans);
    } catch (error) {
      console.error("!! Error al listar:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Crear nuevo préstamo
  async createLoan(req, res) {
    const { name, amount, installments, frequency, interestRate } = req.body;
    console.log(`>> Petición: Crear crédito para [${name}] por valor de $${amount} al ${interestRate}%`);
    
    try {
      let client = await prisma.client.findFirst({ 
        where: { fullName: name } 
      });

      if (!client) {
        console.log(">> El cliente no existe. Creándolo...");
        client = await prisma.client.create({
          data: { 
            fullName: name, 
            documentId: "ID-" + Date.now(),
            phone: "000", 
            address: "PENDIENTE" 
          }
        });
      }

      const rate = interestRate ? parseFloat(interestRate) : 20;
      const totalAmount = parseFloat(amount) * (1 + (rate / 100));
      const loan = await prisma.loan.create({
        data: {
          clientId: client.id,
          capitalAmount: parseFloat(amount),
          interestRate: rate,
          totalAmount: totalAmount,
          balance: totalAmount,
          installmentsTotal: installments ? parseInt(installments) : 20,
          frequency: frequency || 'DAILY',
          status: 'ACTIVE'
        },
        include: { client: true }
      });
      
      console.log(">> ¡ÉXITO! Préstamo guardado correctamente en la base de datos.");
      res.status(201).json(loan);
    } catch (error) {
      console.error("!! ERROR FATAL AL GUARDAR:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Adicionar capital / refinanciación sobre crédito existente
  async addCapital(req, res) {
    const { id } = req.params;
    const { amount, interestRate, installments, frequency, notes } = req.body;
    const loanId = parseInt(id);

    console.log(`>> Petición: Adicionar capital de $${amount} al crédito #${loanId}`);

    try {
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: { client: true, additions: true }
      });

      if (!loan) {
        return res.status(404).json({ error: 'Préstamo no encontrado' });
      }

      if (loan.status !== 'ACTIVE' && loan.status !== 'MORA') {
        return res.status(400).json({ 
          error: `No se puede adicionar capital a un crédito con estado ${loan.status}` 
        });
      }

      const additionalCapital = parseFloat(amount);
      if (isNaN(additionalCapital) || additionalCapital <= 0) {
        return res.status(400).json({ error: 'El monto de capital a adicionar debe ser mayor a 0' });
      }

      const previousBalance = Number(loan.balance);
      const rate = interestRate !== undefined && interestRate !== '' ? parseFloat(interestRate) : Number(loan.interestRate);
      
      // Cálculo: Capital adicional + interés pactado
      const additionalWithInterest = additionalCapital * (1 + (rate / 100));
      const newBalance = previousBalance + additionalWithInterest;

      const newInstallments = installments ? parseInt(installments) : loan.installmentsTotal;
      const newFrequency = frequency || loan.frequency;

      // 1. Guardar en histórico LoanAddition
      const addition = await prisma.loanAddition.create({
        data: {
          loanId: loanId,
          amount: additionalCapital,
          previousBalance: previousBalance,
          newBalance: newBalance,
          notes: notes || 'Adición de capital sobre saldo vigente'
        }
      });

      // 2. Actualizar el saldo y capital del préstamo SIN borrar abonos previos
      const updatedLoan = await prisma.loan.update({
        where: { id: loanId },
        data: {
          capitalAmount: { increment: additionalCapital },
          totalAmount: { increment: additionalWithInterest },
          balance: newBalance,
          interestRate: rate,
          installmentsTotal: newInstallments,
          frequency: newFrequency,
          status: 'ACTIVE'
        },
        include: { 
          client: true,
          additions: true,
          payments: { orderBy: { paymentDate: 'desc' } }
        }
      });

      console.log(`>> ¡ÉXITO! Capital adicionado a crédito #${loanId}. Saldo anterior: $${previousBalance} -> Nuevo Saldo: $${newBalance}`);
      res.status(201).json({
        message: 'Capital adicionado exitosamente',
        addition,
        loan: updatedLoan
      });
    } catch (error) {
      console.error("!! Error al adicionar capital:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async refinance(req, res) {
    // Redirigir a addCapital
    return this.addCapital(req, res);
  },

  async getRecoveryPortfolio(res) {
    try {
      const recovery = await prisma.loan.findMany({
        where: { status: { in: ['MORA', 'CASTIGADO', 'RECOVERY', 'CONGELADO'] } },
        include: { client: true }
      });
      res.json(recovery);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = LoanController;
