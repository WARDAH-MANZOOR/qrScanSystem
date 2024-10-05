import {disburseTransactions, getWalletBalanceController} from "controller/paymentGateway/disbursement/index.js";
import { Router } from "express";
import { isLoggedIn } from "utils/middleware.js";

const router = Router();

router.get("/available-balance",[isLoggedIn],getWalletBalanceController);
router.put("/disburse",[isLoggedIn],disburseTransactions)

export default router;