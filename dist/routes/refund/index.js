import { refundController } from "controller/index.js";
import { Router } from "express";
import { authorize, isLoggedIn } from "utils/middleware.js";
const router = Router();
router.post("/ibft/:merchantId", [isLoggedIn], refundController.refundDisbursmentClone);
router.post("/mw/:merchantId", [isLoggedIn], refundController.refundMWDisbursement);
router.get("/", [isLoggedIn], refundController.getRefund);
router.get("/export", [isLoggedIn], authorize("Reports"), refundController.exportRefund);
export default router;
