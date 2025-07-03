import { reportController } from 'controller/index.js';
import express from 'express';
import { isAdmin, isLoggedIn } from 'utils/middleware.js';

const router = express.Router();

router.get('/excel', [isLoggedIn, isAdmin], reportController.generateExcelReportController as express.RequestHandler);


export default router;