import { swichController } from "../../../controller/index.js";
import { isAdmin, isLoggedIn } from "../../../utils/middleware.js";
import { createSwichMerchantValidation, deleteSwichMerchantValidation, updateSwichMerchantValidation } from "../../../validators/paymentGateway/swich.js";
export default function (router) {
    router.post("/sw-merchant", [isLoggedIn, isAdmin, ...createSwichMerchantValidation], swichController.createSwichMerchant);
    router.get("/sw-merchant", [isLoggedIn, isAdmin], swichController.getSwichMerchant);
    router.put("/sw-merchant/:merchantId", [isLoggedIn, isAdmin, ...updateSwichMerchantValidation], swichController.updateSwichMerchant);
    router.delete("/sw-merchant/:merchantId", [isLoggedIn, isAdmin, ...deleteSwichMerchantValidation], swichController.deleteSwichMerchant);
}
