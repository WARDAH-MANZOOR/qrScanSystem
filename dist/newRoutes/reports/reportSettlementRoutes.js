import { reportController } from 'controller/index.js';
import express from 'express';
const router = express.Router();
router.get('/pending-settlements', reportController.getPendingSettlements);
export default router;
