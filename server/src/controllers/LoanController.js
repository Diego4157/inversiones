const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log(">> CONTROLADOR DE PRÉSTAMOS CARGADO (VERSIÓN 2.0 - FULLNAME FIX)");

const LoanController = {
  // Obtener todos los préstamos
  async getAllLoans(req, res) {
    console.log(">> Petición: Listar todos los préstamos.");
    try {
      const loans = await prisma.loan.findMany({
        include: { client: true },
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
      // Búsqueda usando el nombre de campo correcto en tu schema.prisma: fullName
      let client = await prisma.client.findFirst({ 
        where: { fullName: name } 
      });

      if (!client) {
        console.log(">> El cliente no existe. Creándolo...");
        client = await prisma.client.create({
          data: { 
            fullName: name, 
            documentId: "ID-" + Date.now(), // Generamos un ID temporal único
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
          installmentsTotal: installments || 20,
          frequency: frequency || 'DAILY',
          status: 'ACTIVE'
        }
      });
      
      console.log(">> ¡ÉXITO! Préstamo guardado correctamente en la base de datos.");
      res.status(201).json(loan);
    } catch (error) {
      console.error("!! ERROR FATAL AL GUARDAR:", error);
      res.status(500).json({ error: error.message });
    }
  },

  async refinance(req, res) {
    res.status(501).json({ message: "Mantenimiento" });
  },

  async getRecoveryPortfolio(res) {
    try {
      const recovery = await prisma.loan.findMany({
        where: { status: { in: ['MORA', 'CASTIGADO', 'RECOVERY'] } },
        include: { client: true }
      });
      res.json(recovery);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = LoanController;
