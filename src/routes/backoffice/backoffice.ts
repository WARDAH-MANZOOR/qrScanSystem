import express from 'express';
import backOfficeController from 'controller/backoffice/backoffice.js';
import { isAdmin, isLoggedIn } from 'utils/middleware.js';
const router = express.Router();

// Define routes
router.post('/remove-finance/:merchantId', [isLoggedIn, isAdmin], backOfficeController.removeMerchantFinanceData);

router.post('/zero-wallet/:merchantId', [isLoggedIn, isAdmin], backOfficeController.zeroMerchantWalletBalance);

router.post('/adjust-wallet/:merchantId',  [isLoggedIn, isAdmin], backOfficeController.adjustMerchantWalletBalance);

router.get('/transaction-stats/:merchantId', [isLoggedIn, isAdmin], backOfficeController.checkMerchantTransactionStats);

router.post('/settle-transactions', [isLoggedIn, isAdmin], backOfficeController.settleTransactions);

router.post('/settle-all/:merchantId', [isLoggedIn, isAdmin], backOfficeController.settleAllMerchantTransactions);

router.post("/dummy-transaction/:merchantId",[isLoggedIn, isAdmin], backOfficeController.createTransactionController)


export default router;