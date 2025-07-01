import { zindigiController } from "../../../controller/index.js";
import { isAdmin, isLoggedIn } from "../../../utils/middleware.js";
export default function (router) {
    router.post("/zi-merchant", [isLoggedIn, isAdmin], zindigiController.createZindigiMerchant);
    router.get("/zi-merchant", [isLoggedIn, isAdmin], zindigiController.getZindigiMerchant);
    router.put("/zi-merchant/:merchantId", [isLoggedIn, isAdmin], zindigiController.updateZindigiMerchant);
    router.delete("/zi-merchant/:merchantId", [isLoggedIn, isAdmin], zindigiController.deleteZindigiMerchant);
    return router;
}
