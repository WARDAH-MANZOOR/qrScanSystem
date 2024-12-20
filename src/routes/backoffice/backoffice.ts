import express from 'express';
import backOfficeController from 'controller/backoffice/backoffice.js';
const router = express.Router();

// Define routes
router.post('/remove-finance/:merchantId', backOfficeController.removeMerchantFinanceData);

router.post('/zero-wallet/:merchantId', backOfficeController.zeroMerchantWalletBalance);

router.post('/adjust-wallet/:merchantId', backOfficeController.adjustMerchantWalletBalance);

router.get('/transaction-stats/:merchantId', backOfficeController.checkMerchantTransactionStats);

router.post('/settle-transactions', backOfficeController.settleTransactions);

router.post('/settle-all/:merchantId', backOfficeController.settleAllMerchantTransactions);

export default router;