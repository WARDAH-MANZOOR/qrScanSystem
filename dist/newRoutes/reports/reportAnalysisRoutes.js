import { reportController } from 'controller/index.js';
import express from 'express';
const router = express.Router();
router.get('/payin-per-wallet', reportController.payinPerWalletController);
export default router;
