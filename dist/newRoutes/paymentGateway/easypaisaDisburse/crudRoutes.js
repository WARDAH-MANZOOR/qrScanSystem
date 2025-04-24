import { isAdmin, isLoggedIn } from "../../../utils/middleware.js";
import { easyPaisaDisburse } from "../../../controller/index.js";
export default function (router) {
    router.post("/ep-disburse-account", [isLoggedIn, isAdmin], easyPaisaDisburse.addDisburseAccount);
    router.get("/ep-disburse-account", [isLoggedIn, isAdmin], easyPaisaDisburse.getDisburseAccount);
    router.put("/ep-disburse-account/:accountId", [isLoggedIn, isAdmin], easyPaisaDisburse.updateDisburseAccount);
    router.delete("/ep-disburse-account/:accountId", [isLoggedIn, isAdmin], easyPaisaDisburse.deleteDisburseAccount);
}
