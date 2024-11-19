import { zindigiController } from "controller/index.js";
import { Router } from "express";
import { isAdmin, isLoggedIn } from "utils/middleware.js";

export default function (router: Router) {
    router.post("/initiate-zi", zindigiController.walletToWalletPaymentController)
    router.post("/initiate-zid",zindigiController.debitInquiryController)
    router.post("/inquiry-zi",zindigiController.transactionInquiryController)
    router.post(
        "/zi-merchant",
        [isLoggedIn, isAdmin],
        zindigiController.createZindigiMerchant
      );
      router.get(
        "/zi-merchant",
        [isLoggedIn, isAdmin],
        zindigiController.getZindigiMerchant
      );
      router.put(
        "/zi-merchant/:merchantId",
        [isLoggedIn, isAdmin],
        zindigiController.updateZindigiMerchant
      );
      router.delete(
        "/zi-merchant/:merchantId",
        [isLoggedIn, isAdmin],
        zindigiController.deleteZindigiMerchant
      );
    return router;
}