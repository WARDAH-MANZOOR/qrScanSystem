import { Router } from "express";
import { isLoggedIn, isAdmin } from "../../../utils/middleware.js";
import { easyPaisaController } from "../../../controller/index.js";
import {
  validateCreateMerchant,
  validateUpdateMerchant,
} from "../../../validators/paymentGateway/easypaisa.js";

export default function (router: Router) {
  router.post(
    "/ep-merchant",
    [isLoggedIn, isAdmin, ...validateCreateMerchant],
    easyPaisaController.createEasyPaisaMerchant
  );
  router.get(
    "/ep-merchant",
    [isLoggedIn, isAdmin],
    easyPaisaController.getEasyPaisaMerchant
  );
  router.put(
    "/ep-merchant/:merchantId",
    [isLoggedIn, isAdmin, ...validateUpdateMerchant],
    easyPaisaController.updateEasyPaisaMerchant
  );
  router.delete(
    "/ep-merchant/:merchantId",
    [isLoggedIn, isAdmin, ...validateUpdateMerchant],
    easyPaisaController.deleteEasyPaisaMerchant
  );

  return router;
}
