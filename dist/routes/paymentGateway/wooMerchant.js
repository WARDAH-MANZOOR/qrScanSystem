import { wooController } from "controller/index.js";
import { isAdmin, isLoggedIn } from "utils/middleware.js";
export default function (router) {
    router.get("/woo-config", [isLoggedIn, isAdmin], 
    // validateGetJazzcashMerchant,
    wooController.getWoocommerceMerchant);
    router.post("/woo-config", [isLoggedIn, isAdmin], wooController.createWoocommerceMerchant);
    router.put("/woo-config/:merchantId", [isLoggedIn, isAdmin], wooController.updateWoocommerceMerchant);
    router.delete("/woo-config/:merchantId", [isLoggedIn, isAdmin], wooController.deleteWoocommerceMerchant);
}
