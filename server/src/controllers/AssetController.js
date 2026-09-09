const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Lógica de distribución parametrizable por activo (Cajones de Ahorro)
const distributeRevenueForAsset = (asset, amount) => {
  const parsedAmount = parseFloat(amount);
  
  // Porcentaje de deuda/hipoteca parametrizable (por defecto 51.1%)
  const debtPercent = asset && asset.debtPercent !== null && asset.debtPercent !== undefined 
    ? Number(asset.debtPercent) 
    : 51.1;
  const debt = Math.round(parsedAmount * (debtPercent / 100));

  // Ahorro para seguros / impuestos / SOAT / Predial
  const soat = asset && asset.soatAmount !== null && asset.soatAmount !== undefined 
    ? Number(asset.soatAmount) 
    : 2000;

  // Ahorro para mantenimiento / reparaciones
  const maintenance = asset && asset.maintenanceAmount !== null && asset.maintenanceAmount !== undefined 
    ? Number(asset.maintenanceAmount) 
    : 3000;

  // Ahorro para imprevistos / contingencias / vacancia
  const contingency = asset && asset.contingencyAmount !== null && asset.contingencyAmount !== undefined 
    ? Number(asset.contingencyAmount) 
    : 5000;

  // Utilidad neta restante
  const allocated = debt + soat + maintenance + contingency;
  const profit = Math.max(0, parsedAmount - allocated);

  return { debt, soat, maintenance, contingency, profit };
};

const AssetController = {
  // Obtener todos los activos
  async getAllAssets(req, res) {
    try {
      const assets = await prisma.asset.findMany({
        include: { 
          revenues: { orderBy: { revenueDate: 'desc' } }, 
          drawers: {
            include: {
              transactions: { orderBy: { transactionDate: 'desc' }, take: 10 }
            }
          } 
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(assets);
    } catch (error) {
      console.error('Error al listar activos:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Crear un nuevo activo (Vehículo, Inmueble, Otro)
  async createAsset(req, res) {
    const { 
      name, 
      category, 
      identifier, 
      plate, 
      purchasePrice, 
      dailyTargetIncome, 
      dailyRentTarget,
      status,
      debtPercent,
      soatAmount,
      maintenanceAmount,
      contingencyAmount
    } = req.body;

    try {
      const finalIdentifier = identifier || plate || null;
      const targetIncome = dailyTargetIncome ? parseFloat(dailyTargetIncome) : (dailyRentTarget ? parseFloat(dailyRentTarget) : 35000);

      const asset = await prisma.asset.create({
        data: {
          name,
          category: category || 'VEHICULO',
          identifier: finalIdentifier,
          plate: finalIdentifier, // Retrocompatibilidad
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
          dailyTargetIncome: targetIncome,
          dailyRentTarget: targetIncome, // Retrocompatibilidad
          status: status || 'ACTIVO',
          debtPercent: debtPercent !== undefined ? parseFloat(debtPercent) : 51.1,
          soatAmount: soatAmount !== undefined ? parseFloat(soatAmount) : 2000,
          maintenanceAmount: maintenanceAmount !== undefined ? parseFloat(maintenanceAmount) : 3000,
          contingencyAmount: contingencyAmount !== undefined ? parseFloat(contingencyAmount) : 5000
        }
      });

      // Inicializar automáticamente los 5 cajones de ahorro para este activo
      const initialDrawers = ['DEBT', 'SOAT_TECNO', 'MAINTENANCE', 'CONTINGENCY', 'PROFIT'];
      for (const drawerType of initialDrawers) {
        await prisma.savingsDrawer.create({
          data: {
            assetId: asset.id,
            type: drawerType,
            balance: 0
          }
        });
      }

      res.status(201).json(asset);
    } catch (error) {
      console.error('Error al crear activo:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Actualizar un activo existente
  async updateAsset(req, res) {
    const { id } = req.params;
    const { 
      name, 
      category, 
      identifier, 
      purchasePrice, 
      dailyTargetIncome, 
      status,
      debtPercent,
      soatAmount,
      maintenanceAmount,
      contingencyAmount
    } = req.body;

    try {
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (category !== undefined) updateData.category = category;
      if (identifier !== undefined) {
        updateData.identifier = identifier;
        updateData.plate = identifier;
      }
      if (purchasePrice !== undefined) updateData.purchasePrice = purchasePrice ? parseFloat(purchasePrice) : null;
      if (dailyTargetIncome !== undefined) {
        updateData.dailyTargetIncome = parseFloat(dailyTargetIncome);
        updateData.dailyRentTarget = parseFloat(dailyTargetIncome);
      }
      if (status !== undefined) updateData.status = status;
      if (debtPercent !== undefined) updateData.debtPercent = parseFloat(debtPercent);
      if (soatAmount !== undefined) updateData.soatAmount = parseFloat(soatAmount);
      if (maintenanceAmount !== undefined) updateData.maintenanceAmount = parseFloat(maintenanceAmount);
      if (contingencyAmount !== undefined) updateData.contingencyAmount = parseFloat(contingencyAmount);

      const updated = await prisma.asset.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: { drawers: true }
      });

      res.json(updated);
    } catch (error) {
      console.error('Error al actualizar activo:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Registrar ingreso diario y distribuir en cajones parametrizados
  async recordDailyRevenue(req, res) {
    const { assetId, amount } = req.body;

    try {
      const parsedAssetId = parseInt(assetId);
      const parsedAmount = parseFloat(amount);

      const asset = await prisma.asset.findUnique({
        where: { id: parsedAssetId }
      });

      if (!asset) {
        return res.status(404).json({ error: 'Activo no encontrado' });
      }

      // 1. Calcular la distribución según los parámetros de este activo
      const distribution = distributeRevenueForAsset(asset, parsedAmount);

      // 2. Registrar el ingreso total
      const revenue = await prisma.assetRevenue.create({
        data: {
          assetId: parsedAssetId,
          amountReceived: parsedAmount
        }
      });

      // 3. Actualizar o crear los 5 cajones y registrar la transacción
      const drawerTypes = [
        { type: 'DEBT', amount: distribution.debt, label: 'Deuda / Crédito' },
        { type: 'SOAT_TECNO', amount: distribution.soat, label: 'Seguros / Impuestos' },
        { type: 'MAINTENANCE', amount: distribution.maintenance, label: 'Mantenimiento' },
        { type: 'CONTINGENCY', amount: distribution.contingency, label: 'Imprevistos' },
        { type: 'PROFIT', amount: distribution.profit, label: 'Utilidad Neta' }
      ];

      for (const item of drawerTypes) {
        const existingDrawer = await prisma.savingsDrawer.findFirst({
          where: { assetId: parsedAssetId, type: item.type }
        });

        let drawerId;
        if (existingDrawer) {
          const updatedDrawer = await prisma.savingsDrawer.update({
            where: { id: existingDrawer.id },
            data: {
              balance: { increment: item.amount },
              lastUpdated: new Date()
            }
          });
          drawerId = updatedDrawer.id;
        } else {
          const createdDrawer = await prisma.savingsDrawer.create({
            data: {
              assetId: parsedAssetId,
              type: item.type,
              balance: item.amount
            }
          });
          drawerId = createdDrawer.id;
        }

        await prisma.drawerTransaction.create({
          data: {
            drawerId: drawerId,
            amount: item.amount,
            description: `Ingreso diario ${new Date().toLocaleDateString()} (${item.label})`
          }
        });
      }

      res.status(201).json({ 
        message: 'Ingreso distribuido correctamente en los cajones de ahorro', 
        distribution,
        revenue 
      });
    } catch (error) {
      console.error('Error al registrar renta de activo:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener estado de cajones de un activo
  async getAssetStatus(req, res) {
    const { id } = req.params;
    try {
      const status = await prisma.savingsDrawer.findMany({
        where: { assetId: parseInt(id) },
        include: {
          transactions: {
            orderBy: { transactionDate: 'desc' },
            take: 20
          }
        }
      });
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = AssetController;
