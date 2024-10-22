import { swichController } from "controller/index.js";
import { Router } from "express";
import { isAdmin, isLoggedIn } from "utils/middleware.js";

export default function (router: Router) {
    router.post("/initiate-sw/:merchantId", swichController.initiateSwichController);
    router.post(
        "/sw-merchant",
        [isLoggedIn, isAdmin],
        swichController.createSwichMerchant
    );
    router.get(
        "/sw-merchant",
        [isLoggedIn, isAdmin],
        swichController.getSwichMerchant
    );
    router.put(
        "/sw-merchant/:merchantId",
        [isLoggedIn, isAdmin],
        swichController.updateSwichMerchant
    );
    router.delete(
        "/sw-merchant/:merchantId",
        [isLoggedIn, isAdmin],
        swichController.deleteSwichMerchant
    );
}