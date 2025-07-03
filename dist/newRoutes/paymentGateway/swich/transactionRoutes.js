import { swichController } from "../../../controller/index.js";
import { initiateSwichValidation } from "../../../validators/paymentGateway/swich.js";
export default function (router) {
    router.post("/initiate-sw/:merchantId", initiateSwichValidation, swichController.initiateSwichController);
}
