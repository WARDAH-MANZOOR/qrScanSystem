import { Router } from "express";
import { jazzCashController } from "controller/index.js";
import { isLoggedIn, isAdmin } from "utils/middleware.js";

const router = Router();

// Define routes using arrow functions
router.post("/initiate-jz/:merchantId", jazzCashController.initiateJazzCash);
// Merchant Config
router.get(
  "/merchant-config",
  [isLoggedIn, isAdmin],
  jazzCashController.getJazzCashMerchant
);
router.post(
  "/merchant-config",
  [isLoggedIn, isAdmin],
  jazzCashController.createJazzCashMerchant
);
router.put(
  "/merchant-config/:merchantId",
  [isLoggedIn, isAdmin],
  jazzCashController.updateJazzCashMerchant
);
router.delete(
  "/merchant-config/:merchantId",
  [isLoggedIn, isAdmin],
  jazzCashController.deleteJazzCashMerchant
);

export default router;
