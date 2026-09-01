const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Lógica de distribución (Cajones de Ahorro)
const distributeRevenue = (amount) => {
  const debt = Math.round(amount * 0.511); // 51% aprox $17,885
  const soat = 2000;
  const maintenance = 3000;
  const contingency = 5000;
  const profit = Math.max(0, amount - (debt + soat + maintenance + contingency));

  return { debt, soat, maintenance, contingency, profit };
};

const AssetController = {
  // Obtener todos los activos
  async getAllAssets(req, res) {
    try {
      const assets = await prisma.asset.findMany({
        include: { revenues: true, drawers: true }
      });
      res.json(assets);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Crear un nuevo activo
  async createAsset(req, res) {
    const { name, plate, purchasePrice, dailyRentTarget } = req.body;
    try {
      const asset = await prisma.asset.create({
        data: {
          name,
          plate,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
          dailyRentTarget: dailyRentTarget ? parseFloat(dailyRentTarget) : 35000
        }
      });
      res.status(201).json(asset);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Registrar ingreso diario y distribuir
  async recordDailyRevenue(req, res) {
    const { assetId, amount } = req.body;

    try {
      const distribution = distributeRevenue(amount);

      // 1. Registrar el ingreso total
      const revenue = await prisma.assetRevenue.create({
        data: {
          assetId: parseInt(assetId),
          amountReceived: amount
        }
      });

      // 2. Actualizar o crear cajones y registrar transacciones
      const drawerTypes = [
        { type: 'DEBT', amount: distribution.debt },
        { type: 'SOAT_TECNO', amount: distribution.soat },
        { type: 'MAINTENANCE', amount: distribution.maintenance },
        { type: 'CONTINGENCY', amount: distribution.contingency },
        { type: 'PROFIT', amount: distribution.profit }
      ];

      for (const item of drawerTypes) {
        const drawer = await prisma.savingsDrawer.upsert({
          where: { 
            // Nota: En un sistema real usaríamos un ID único compuesto o buscar por assetId y type
            id: (await prisma.savingsDrawer.findFirst({ where: { assetId, type: item.type } }))?.id || 0
          },
          update: { 
            balance: { increment: item.amount },
            lastUpdated: new Date()
          },
          create: {
            assetId,
            type: item.type,
            balance: item.amount
          }
        });

        await prisma.drawerTransaction.create({
          data: {
            drawerId: drawer.id,
            amount: item.amount,
            description: `Distribución ingreso día ${new Date().toLocaleDateString()}`
          }
        });
      }

      res.status(201).json({ message: 'Ingreso distribuido correctamente', distribution });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getAssetStatus(req, res) {
    const { id } = req.params;
    try {
      const status = await prisma.savingsDrawer.findMany({
        where: { assetId: parseInt(id) }
      });
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = AssetController;
