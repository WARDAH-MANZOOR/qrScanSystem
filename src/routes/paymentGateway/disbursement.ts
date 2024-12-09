import {
  disburseTransactions,
  getWalletBalanceController,
} from "../../controller/paymentGateway/disbursement.js";
import { easyPaisaController } from "../../controller/index.js";
import { Router } from "express";
import { isLoggedIn } from "../../utils/middleware.js";

const router = Router();

router.get("/", [isLoggedIn], easyPaisaController.getDisbursement);
router.get("/available-balance", [isLoggedIn], getWalletBalanceController);
router.put("/disburse", [isLoggedIn], disburseTransactions);

export default router;