import { payfastController } from "controller/index.js";
import { Router } from "express";
import { isAdmin, isLoggedIn } from "utils/middleware.js";

export default function(router: Router) {
    router.get("/pf-merchant", [isLoggedIn, isAdmin], payfastController.getPayFastMerchant);
    router.post("/pf-merchant", [isLoggedIn, isAdmin], payfastController.createPayFastMerchant)
    router.put("/pf-merchant/:merchantId", [isLoggedIn, isAdmin], payfastController.updatePayFastMerchant)
    router.delete("/pf-merchant/:merchantId", [isLoggedIn, isAdmin], payfastController.deletePayFastMerchant)
}