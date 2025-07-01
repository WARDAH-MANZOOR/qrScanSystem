import { disburseTransactions, } from "../../../controller/paymentGateway/disbursement.js";
import { Router } from "express";
import { isLoggedIn } from "../../../utils/middleware.js";
const router = Router();
router.put("/disburse", [isLoggedIn], disburseTransactions);
export default router;
