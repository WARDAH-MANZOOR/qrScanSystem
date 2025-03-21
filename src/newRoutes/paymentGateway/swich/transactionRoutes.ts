import { swichController } from "../../../controller/index.js";
import { Router } from "express";

import {  initiateSwichValidation } from "../../../validators/paymentGateway/swich.js";

export default function (router: Router) {
  router.post(
    "/initiate-sw/:merchantId",
    initiateSwichValidation,
    swichController.initiateSwichController
  );

}
