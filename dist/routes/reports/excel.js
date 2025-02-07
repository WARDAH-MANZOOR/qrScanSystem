import { reportController } from 'controller/index.js';
import express from 'express';
const router = express.Router();
router.get('/excel', reportController.generateExcelReportController);
export default router;
