import {
  disburseTransactions,
  getWalletBalanceController,
  getWalletBalanceControllerWithKey,
} from "../../../controller/paymentGateway/disbursement.js";
import { easyPaisaController } from "../../../controller/index.js";
import { Router } from "express";
import { authorize, isLoggedIn } from "../../../utils/middleware.js";
import { apiKeyAuth } from "middleware/auth.js";

const router = Router();

router.get("/available-balance", [isLoggedIn], getWalletBalanceController);
router.get("/available-balance/:merchantId", [apiKeyAuth], getWalletBalanceControllerWithKey);


export default router;