import { Router } from "express";
import { isAdmin, isLoggedIn } from "../../utils/middleware.js";
import { paymentRequestController } from "../../controller/index.js";

const router = Router();

router.post(
  "/pay",
  paymentRequestController.payRequestedPayment
);

router.get("/:id", paymentRequestController.getPaymentRequestbyId);

router.get("/", [isLoggedIn], paymentRequestController.getPaymentRequest);
router.post("/", [isLoggedIn], paymentRequestController.createPaymentRequest);
router.post("/:merchantId", paymentRequestController.createPaymentRequestClone);

// router.post("/new", [isLoggedIn], paymentRequestController.createPaymentRequest);
router.put(
  "/:paymentRequestId",
  [isLoggedIn],
  paymentRequestController.updatePaymentRequest
);
router.delete(
  "/:paymentRequestId",
  [isLoggedIn],
  paymentRequestController.deletePaymentRequest
);

export default router;
