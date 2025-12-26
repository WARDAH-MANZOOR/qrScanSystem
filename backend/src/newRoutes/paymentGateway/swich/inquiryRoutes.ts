import { swichController } from "../../../controller/index.js";
import { Router } from "express";
import { swichTxInquiryValidation } from "../../../validators/paymentGateway/swich.js";

export default function (router: Router) {
  
  router.get(
    "/sw-inquiry/:merchantId",
    swichTxInquiryValidation,
    swichController.swichTxInquiry
  );
}
