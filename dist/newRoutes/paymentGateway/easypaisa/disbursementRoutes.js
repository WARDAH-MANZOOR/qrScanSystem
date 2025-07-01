import { isLoggedIn, authorize } from "../../../utils/middleware.js";
import { easyPaisaController } from "../../../controller/index.js";
import { apiKeyAuth } from "../../../middleware/auth.js";
import { validateInquiry, } from "../../../validators/paymentGateway/easypaisa.js";
export default function (router) {
    router.post("/ep-disburse/:merchantId", [apiKeyAuth], easyPaisaController.createDisbursementClone);
    router.post("/epc-disburse/:merchantId", [apiKeyAuth], easyPaisaController.createDisbursementClone);
    router.post("/epb-disburse/:merchantId", [apiKeyAuth], easyPaisaController.disburseThroughBankClone);
    router.post("/epbc-disburse/:merchantId", [apiKeyAuth], easyPaisaController.disburseThroughBankClone);
    router.get("/inquiry-ep/:merchantId", [...validateInquiry], easyPaisaController.statusInquiry);
    router.get("/ep-disburse", [isLoggedIn], authorize("Reports"), easyPaisaController.getDisbursement);
    return router;
}
