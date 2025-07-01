import { jazzCashController } from "../../../controller/index.js";
import { apiKeyAuth } from "../../../middleware/auth.js";
export default function (router) {
    router.post("/jzw-disburse/:merchantId", [apiKeyAuth], jazzCashController.initiateMWDisbursement);
    router.post("/jzwc-disburse/:merchantId", [apiKeyAuth], jazzCashController.initiateMWDisbursement);
    router.post("/jz-disburse-status/:merchantId", [apiKeyAuth], jazzCashController.disburseInquiryController);
    router.post("/sjz-disburse-status/:merchantId", jazzCashController.simpleDisburseInquiryController);
    router.post("/ssjz-disburse-status/:merchantId", jazzCashController.simpleSandboxDisburseInquiryController);
    router.post("/spjz-disburse-status/:merchantId", jazzCashController.simpleSandboxDisburseInquiryController);
    router.post("/ssjzw-disburse/:merchantId", jazzCashController.initiateSandboxMWDisbursementClone);
    router.post("/spjzw-disburse/:merchantId", jazzCashController.initiateProductionMWDisbursementClone);
    // Define routes using arrow functions
    router.post("/jz-disburse/:merchantId", [apiKeyAuth], jazzCashController.initiateDisbursmentClone);
    router.post("/ssjz-disburse/:merchantId", jazzCashController.initiateSandboxDisbursmentClone);
    router.post("/spjz-disburse/:merchantId", jazzCashController.initiateProductionDisbursmentClone);
    router.post("/jzc-disburse/:merchantId", [apiKeyAuth], jazzCashController.initiateDisbursmentClone);
    return router;
}
