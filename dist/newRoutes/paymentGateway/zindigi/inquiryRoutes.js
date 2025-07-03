import { zindigiController } from "../../../controller/index.js";
export default function (router) {
    router.post("/initiate-zid", zindigiController.debitInquiryController);
    router.post("/inquiry-zi", zindigiController.transactionInquiryController);
    return router;
}
