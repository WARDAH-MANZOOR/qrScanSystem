import { swichController } from "../../../controller/index.js";
import { swichTxInquiryValidation } from "../../../validators/paymentGateway/swich.js";
export default function (router) {
    router.get("/sw-inquiry/:merchantId", swichTxInquiryValidation, swichController.swichTxInquiry);
}
