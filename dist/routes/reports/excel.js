import { reportController } from 'controller/index.js';
import express from 'express';
import { isAdmin, isLoggedIn } from 'utils/middleware.js';
const router = express.Router();
router.get('/excel', [isLoggedIn, isAdmin], reportController.generateExcelReportController);
router.get('/payin-per-wallet', reportController.payinPerWalletController);
router.get('/payout-per-wallet', reportController.payoutPerWalletController);
router.get('/pending-settlements', reportController.getPendingSettlements);
export default router;
