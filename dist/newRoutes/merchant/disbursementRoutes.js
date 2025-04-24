import { Router } from "express";
import { merchantController } from "../../controller/index.js";
import { isLoggedIn, authorize } from "../../utils/middleware.js";
const router = Router();
router.post("/set-percent", [isLoggedIn], authorize("Dashboard"), merchantController.setDisbursePercent);
export default router;
