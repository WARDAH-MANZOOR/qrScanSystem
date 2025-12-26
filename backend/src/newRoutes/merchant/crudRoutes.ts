import { Router } from "express";
import { merchantController } from "../../controller/index.js";
import { isLoggedIn, isAdmin, authorize } from "../../utils/middleware.js";
import { addMerchantValidation, updateMerchantValidation } from "../../validators/merchant/index.js";


const router = Router();

router.get("/", [isLoggedIn, isAdmin], merchantController.getMerchants);
router.put("/", [isLoggedIn, isAdmin, ...updateMerchantValidation], merchantController.updateMerchant);
router.post("/", [isLoggedIn, isAdmin, ...addMerchantValidation], merchantController.addMerchant);
export default router;

