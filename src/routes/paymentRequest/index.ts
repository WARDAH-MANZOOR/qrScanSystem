import { Router } from "express";
import { authorize, isAdmin, isLoggedIn } from "../../utils/middleware.js";
import { paymentRequestController } from "../../controller/index.js";
import block_phone_number_middleware from "utils/block_phone_number_middleware.js";

const router = Router();

router.post(
  "/pay",
  block_phone_number_middleware.blockPhoneNumberInRedirection,
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
