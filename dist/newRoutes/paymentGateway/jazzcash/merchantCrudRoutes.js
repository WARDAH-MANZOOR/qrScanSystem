import { jazzCashController } from "../../../controller/index.js";
import { isLoggedIn, isAdmin } from "../../../utils/middleware.js";
import { validateCreateJazzcashMerchant, validateDeleteJazzcashMerchant, validateUpdateJazzcashMerchant, } from "../../../validators/paymentGateway/jazzCash.js";
export default function (router) {
    // Merchant Config
    router.get("/merchant-config", [isLoggedIn, isAdmin], 
    // validateGetJazzcashMerchant,
    jazzCashController.getJazzCashMerchant);
    router.post("/merchant-config", [isLoggedIn, isAdmin], validateCreateJazzcashMerchant, jazzCashController.createJazzCashMerchant);
    router.put("/merchant-config/:merchantId", [isLoggedIn, isAdmin], validateUpdateJazzcashMerchant, jazzCashController.updateJazzCashMerchant);
    router.delete("/merchant-config/:merchantId", [isLoggedIn, isAdmin], validateDeleteJazzcashMerchant, jazzCashController.deleteJazzCashMerchant);
    return router;
}
