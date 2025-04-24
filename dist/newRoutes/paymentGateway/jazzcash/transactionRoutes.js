import { jazzCashController } from "../../../controller/index.js";
import { validateJazzcashCnicRequest, validateJazzcashRequest, } from "../../../validators/paymentGateway/jazzCash.js";
import { apiKeyAuth } from "../../../middleware/auth.js";
export default function (router) {
    router.post("/initiate-jz/:merchantId", validateJazzcashRequest, jazzCashController.initiateJazzCash);
    router.post("/initiate-jzc/:merchantId", validateJazzcashCnicRequest, jazzCashController.initiateJazzCashCnic);
    router.post("/initiate-jza/:merchantId", [apiKeyAuth, ...validateJazzcashRequest], jazzCashController.initiateJazzCashAsync);
    return router;
}
