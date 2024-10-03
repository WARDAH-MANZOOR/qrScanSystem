import getWalletBalanceController from "controller/paymentGateway/disbursement/index.js";
import { Router } from "express";
import { isLoggedIn } from "utils/middleware.js";

const router = Router();

router.get("/available-balance",[isLoggedIn],getWalletBalanceController);

export default router;