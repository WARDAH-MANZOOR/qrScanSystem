import { payfastController } from "controller/index.js";
import { Router } from "express";
import { isAdmin, isLoggedIn } from "utils/middleware.js";

export default function(router: Router) {
    router.post("/initiate-pf/:merchantId", payfastController.pay);
    router.post("/initiate-upv/:merchantId", payfastController.upaisaValidation);
    router.post("/initiate-upp/:merchantId", payfastController.upaisaPay);
    router.post("/initiate-zinv/:merchantId", payfastController.zindigiValidation);
    router.post("/initiate-zinp/:merchantId", payfastController.zindigiPay);
    router.get("/inquiry-pf/:merchantId", payfastController.statusInquiry);
    router.get("/pf-merchant", [isLoggedIn, isAdmin], payfastController.getPayFastMerchant);
    router.post("/pf-merchant", [isLoggedIn, isAdmin], payfastController.createPayFastMerchant)
    router.put("/pf-merchant/:merchantId", [isLoggedIn, isAdmin], payfastController.updatePayFastMerchant)
    router.delete("/pf-merchant/:merchantId", [isLoggedIn, isAdmin], payfastController.deletePayFastMerchant)
}