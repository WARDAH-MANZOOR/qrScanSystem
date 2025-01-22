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

router.post('/settle-transactions/tele', backOfficeController.settleTransactionsForTelegram);

router.post('/settle-all/:merchantId', [isLoggedIn, isAdmin], backOfficeController.settleAllMerchantTransactions);

router.post("/dummy-transaction/:merchantId",[isLoggedIn, isAdmin], backOfficeController.createTransactionController)

router.delete("/delete-merchant-data/:merchantId",[isLoggedIn, isAdmin], backOfficeController.deleteMerchantDataController)

router.post("/payin-callback",backOfficeController.payinCallback)

router.post("/payout-callback",backOfficeController.payoutCallback)


export default router;