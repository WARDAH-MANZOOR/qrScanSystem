import { refundController } from "controller/index.js";
import { Router } from "express";

const router = Router();

router.post("/ibft/:merchantId",refundController.refundDisbursmentClone)
router.post("/mw/:merchantId", refundController.refundMWDisbursement)

export default router;