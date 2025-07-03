import { getWalletBalanceController, getWalletBalanceControllerWithKey, } from "../../../controller/paymentGateway/disbursement.js";
import { Router } from "express";
import { isLoggedIn } from "../../../utils/middleware.js";
import { apiKeyAuth } from "middleware/auth.js";
const router = Router();
router.get("/available-balance", [isLoggedIn], getWalletBalanceController);
router.get("/available-balance/:merchantId", [apiKeyAuth], getWalletBalanceControllerWithKey);
export default router;
