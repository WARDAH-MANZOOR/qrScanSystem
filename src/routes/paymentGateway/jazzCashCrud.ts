import { jazzCashCrud } from "controller/index.js";
import { Router } from "express";
import { isAdmin, isLoggedIn } from "utils/middleware.js";
import { validateCreateJazzcashMerchant, validateDeleteJazzcashMerchant, validateUpdateJazzcashMerchant } from "validators/paymentGateway/jazzCash.js";

export default function (router: Router) {
    router.get(
        "/jazzCard-config",
        [isLoggedIn, isAdmin],
        // validateGetJazzcashMerchant,
        jazzCashCrud.getJazzCashCardMerchant
      );
      router.post(
        "/jazzCard-config",
        [isLoggedIn, isAdmin],
        validateCreateJazzcashMerchant,
        jazzCashCrud.createJazzCashCardMerchant
      );
      router.put(
        "/jazzCard-config/:merchantId",
        [isLoggedIn, isAdmin],
        validateUpdateJazzcashMerchant,
        jazzCashCrud.updateJazzCashCardMerchant
      );
      router.delete(
        "/jazzCard-config/:merchantId",
        [isLoggedIn, isAdmin],
        validateDeleteJazzcashMerchant,
        jazzCashCrud.deleteJazzCashCardMerchant
      );
}