import { Router } from "express";
import { isAdmin, isLoggedIn } from "utils/middleware.js";
import { paymentRequestController } from "controller/index.js";

const router = Router();

router.use([isLoggedIn]);

router.post("/", paymentRequestController.createPaymentRequest);
router.get("/", paymentRequestController.getPaymentRequest);
router.put(
  "/:paymentRequestId",
  paymentRequestController.updatePaymentRequest
);
router.delete(
  "/:paymentRequestId",
  paymentRequestController.deletePaymentRequest
);

export default router;
