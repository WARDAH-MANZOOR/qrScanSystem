import { Router } from "express";
import { paymentRequestController } from "../../controller/index.js";

const router = Router();

router.post(
  "/pay",
  paymentRequestController.payRequestedPayment
);

export default router;
