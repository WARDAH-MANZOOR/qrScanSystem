import { Router } from "express";
import { jazzCashController } from "../../../controller/index.js";
import { isLoggedIn, isAdmin } from "../../../utils/middleware.js";
import {
  validateCreateJazzcashMerchant,
  validateDeleteJazzcashMerchant,
  validateGetJazzcashMerchant,
  validateJazzcashCnicRequest,
  validateJazzcashRequest,
  validateUpdateJazzcashMerchant,
} from "../../../validators/paymentGateway/jazzCash.js";
import { apiKeyAuth } from "../../../middleware/auth.js";
import { limiter } from "utils/rate_limit.js";

export default function (router: Router) {

  router.post(
    "/initiate-jz/:merchantId",
    validateJazzcashRequest,
    jazzCashController.initiateJazzCash
  );

  router.post(
    "/initiate-jzc/:merchantId",
    validateJazzcashCnicRequest,
    jazzCashController.initiateJazzCashCnic
  );

  router.post(
    "/initiate-jza/:merchantId",
    [apiKeyAuth, ...validateJazzcashRequest],
    jazzCashController.initiateJazzCashAsync
  );

  return router;
}