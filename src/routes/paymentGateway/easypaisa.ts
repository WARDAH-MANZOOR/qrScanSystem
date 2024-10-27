import { Router } from "express";
import { isLoggedIn, isAdmin } from "utils/middleware.js";
import { easyPaisaController } from "controller/index.js";

export default function (router: Router) {
  router.post(
    "/ep-disburse/:merchantId",
    [isLoggedIn],
    easyPaisaController.createDisbursement
  );

  router.post(
    "/initiate-ep/:merchantId",
    easyPaisaController.initiateEasyPaisa
  );

  router.post(
    "/ep-merchant",
    [isLoggedIn, isAdmin],
    easyPaisaController.createEasyPaisaMerchant
  );
  router.get(
    "/ep-merchant",
    [isLoggedIn, isAdmin],
    easyPaisaController.getEasyPaisaMerchant
  );
  router.put(
    "/ep-merchant/:merchantId",
    [isLoggedIn, isAdmin],
    easyPaisaController.updateEasyPaisaMerchant
  );
  router.delete(
    "/ep-merchant/:merchantId",
    [isLoggedIn, isAdmin],
    easyPaisaController.deleteEasyPaisaMerchant
  );
  router.get("/inquiry-ep/:merchantId", easyPaisaController.statusInquiry);
  return router;
}
