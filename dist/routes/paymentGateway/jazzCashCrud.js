import { jazzCashCrud } from "controller/index.js";
import { isAdmin, isLoggedIn } from "utils/middleware.js";
import { validateCreateJazzcashMerchant, validateDeleteJazzcashMerchant, validateUpdateJazzcashMerchant } from "validators/paymentGateway/jazzCash.js";
export default function (router) {
    router.get("/jazzCard-config", [isLoggedIn, isAdmin], 
    // validateGetJazzcashMerchant,
    jazzCashCrud.getJazzCashCardMerchant);
    router.post("/jazzCard-config", [isLoggedIn, isAdmin], validateCreateJazzcashMerchant, jazzCashCrud.createJazzCashCardMerchant);
    router.put("/jazzCard-config/:merchantId", [isLoggedIn, isAdmin], validateUpdateJazzcashMerchant, jazzCashCrud.updateJazzCashCardMerchant);
    router.delete("/jazzCard-config/:merchantId", [isLoggedIn, isAdmin], validateDeleteJazzcashMerchant, jazzCashCrud.deleteJazzCashCardMerchant);
}
