import { Router } from "express";
import { isLoggedIn, isAdmin, authorize } from "../../../utils/middleware.js";
import { easyPaisaController } from "../../../controller/index.js";
import { apiKeyAuth } from "../../../middleware/auth.js";
import {
  validateInquiry,
} from "../../../validators/paymentGateway/easypaisa.js";

export default function (router: Router) {

  router.get(
    "/ep-bal/:merchantId",
    [isLoggedIn, isAdmin],
    easyPaisaController.accountBalance
  );

  router.post(
    "/epd-inquiry/:merchantId",
    [apiKeyAuth],
    easyPaisaController.transactionInquiry
  );

  router.post(
    "/sepd-inquiry/:merchantId",
    easyPaisaController.transactionInquiry
  );
  router.get(
    "/inquiry-ep/:merchantId",
    [...validateInquiry],
    easyPaisaController.statusInquiry
  );
  return router;
}


