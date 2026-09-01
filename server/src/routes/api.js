const express = require('express');
const router = express.Router();
const AssetController = require('../controllers/AssetController');
const LoanController = require('../controllers/LoanController');
const PaymentController = require('../controllers/PaymentController');
const ReceiptController = require('../controllers/ReceiptController');
const ReportController = require('../controllers/ReportController');
const ModalityController = require('../controllers/ModalityController');
const PaymentPromiseController = require('../controllers/PaymentPromiseController');
const ClientController = require('../controllers/ClientController');
const InvestorController = require('../controllers/InvestorController');

// Rutas de Activos (Motos)
router.get('/assets', AssetController.getAllAssets);
router.post('/assets', AssetController.createAsset);
router.post('/assets/revenue', AssetController.recordDailyRevenue);
router.get('/assets/:id/status', AssetController.getAssetStatus);

// Rutas de Préstamos
router.get('/loans', LoanController.getAllLoans);
router.post('/loans', LoanController.createLoan);
router.post('/loans/refinance', LoanController.refinance);
router.get('/loans/recovery', (req, res) => LoanController.getRecoveryPortfolio(res));

// Rutas de Pagos
router.post('/payments', PaymentController.recordPayment);

// Rutas de Recibos
router.post('/receipts/generate', ReceiptController.generateDailyRoute);
router.post('/receipts/civic', ReceiptController.declareCivicDay);
router.get('/receipts/date', ReceiptController.getRouteByDate);
router.put('/receipts/:id/status', ReceiptController.updateReceiptStatus);
router.post('/receipts/manual', ReceiptController.createManualReceipt);
router.post('/receipts/close', ReceiptController.closeRoute);
router.get('/receipts/is-closed', ReceiptController.isRouteClosed);
router.get('/receipts/status-check', ReceiptController.checkRouteStatus);

// Rutas de Promesas de Pago
router.post('/promises', PaymentPromiseController.createPromise);
router.get('/promises/date', PaymentPromiseController.getPromisesByDate);
router.put('/promises/:id/status', PaymentPromiseController.updatePromiseStatus);

// Rutas de Reportes
router.get('/reports/daily', ReportController.getDailySummary);

// Rutas de Modalidades
router.get('/modalities', ModalityController.getAll);
router.post('/modalities', ModalityController.create);
router.delete('/modalities/:id', ModalityController.delete);

// Rutas de Clientes
router.get('/clients', ClientController.getAllClients);
router.post('/clients', ClientController.createClient);
router.put('/clients/:id', ClientController.updateClient);
router.delete('/clients/:id', ClientController.deleteClient);

// Rutas de Inversionistas
router.get('/investors', InvestorController.getAllInvestors);
router.post('/investors', InvestorController.createInvestor);
router.put('/investors/:id', InvestorController.updateInvestor);
router.post('/investors/transactions', InvestorController.addTransaction);

module.exports = router;
