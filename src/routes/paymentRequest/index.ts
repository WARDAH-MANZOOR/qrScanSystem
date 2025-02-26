import { Router } from "express";
import { authorize, isAdmin, isLoggedIn } from "../../utils/middleware.js";
import { paymentRequestController } from "../../controller/index.js";

const router = Router();

router.post(
  "/pay",
  paymentRequestController.payRequestedPayment
);

router.get("/:id", paymentRequestController.getPaymentRequestbyId);

router.get("/", [isLoggedIn], authorize("Invoice Link"), paymentRequestController.getPaymentRequest);
router.post("/", [isLoggedIn], authorize("Invoice Link"), paymentRequestController.createPaymentRequest);
router.post("/:merchantId", paymentRequestController.createPaymentRequestClone);

// router.post("/new", [isLoggedIn], paymentRequestController.createPaymentRequest);
router.put(
  "/:paymentRequestId",
  [isLoggedIn],
  authorize("Invoice Link"),
  paymentRequestController.updatePaymentRequest
);
router.delete(
  "/:paymentRequestId",
  [isLoggedIn],
  authorize("Invoice Link"),
  paymentRequestController.deletePaymentRequest
);

export default router;
