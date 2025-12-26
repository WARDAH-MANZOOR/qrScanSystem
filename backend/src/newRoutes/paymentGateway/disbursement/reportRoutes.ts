
import { easyPaisaController } from "../../../controller/index.js";
import { Router } from "express";
import { authorize, isLoggedIn } from "../../../utils/middleware.js";

const router = Router();

router.get("/", [isLoggedIn], authorize("Reports"), easyPaisaController.getDisbursement);
router.get("/tele", easyPaisaController.getDisbursement);
router.get("/export", [isLoggedIn], authorize("Reports"), easyPaisaController.exportDisbursement);

export default router;