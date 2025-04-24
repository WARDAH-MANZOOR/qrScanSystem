import { easyPaisaController } from "../../../controller/index.js";
import { apiKeyAuth } from "../../../middleware/auth.js";
import { validateEasypaisaTxn, } from "../../../validators/paymentGateway/easypaisa.js";
export default function (router) {
    router.post("/initiate-ep/:merchantId", validateEasypaisaTxn, easyPaisaController.initiateEasyPaisa);
    router.post("/initiate-epa/:merchantId", [apiKeyAuth, ...validateEasypaisaTxn], easyPaisaController.initiateEasyPaisaAsync);
    router.post("/initiate-epc/:merchantId", validateEasypaisaTxn, easyPaisaController.initiateEasyPaisa);
    router.post("/initiate-epac/:merchantId", [apiKeyAuth, ...validateEasypaisaTxn], easyPaisaController.initiateEasyPaisaAsync);
    return router;
}
