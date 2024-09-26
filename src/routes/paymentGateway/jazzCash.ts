// src/routes/paymentRoutes.ts
import { Router } from 'express';
import { jazzCashController } from 'controller/index.js';

const router = Router();

// Define routes using arrow functions
router.post('/initiate-jz', jazzCashController.initiateJazzCash);

export default router;
