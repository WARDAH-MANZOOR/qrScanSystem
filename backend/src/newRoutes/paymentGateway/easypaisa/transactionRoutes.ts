import { Router } from "express";
import { isLoggedIn, isAdmin, authorize } from "../../../utils/middleware.js";
import { easyPaisaController } from "../../../controller/index.js";
import { apiKeyAuth } from "../../../middleware/auth.js";
import {
  validateEasypaisaTxn,
  validateCreateMerchant,
  validateUpdateMerchant,
  validateInquiry,
} from "../../../validators/paymentGateway/easypaisa.js";

export default function (router: Router) {
  router.post(
    "/initiate-ep/:merchantId",
    validateEasypaisaTxn,
    easyPaisaController.initiateEasyPaisa
  );

  router.post(
    "/initiate-epa/:merchantId",
    [apiKeyAuth, ...validateEasypaisaTxn],
    easyPaisaController.initiateEasyPaisaAsync
  );

  router.post(
    "/initiate-epc/:merchantId",
    validateEasypaisaTxn,
    easyPaisaController.initiateEasyPaisa
  );

  router.post(
    "/initiate-epac/:merchantId",
    [apiKeyAuth, ...validateEasypaisaTxn],
    easyPaisaController.initiateEasyPaisaAsync
  );

  return router;
}