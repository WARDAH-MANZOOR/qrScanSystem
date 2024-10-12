import { Router } from 'express';
import { jazzCashController } from 'controller/index.js';
import { isLoggedIn } from 'utils/middleware.js';

const router = Router();

// Define routes using arrow functions
router.post('/initiate-jz/:merchantId', jazzCashController.initiateJazzCash);

export default router;
