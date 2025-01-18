import { exportSettlements, getSettlements } from "../../controller/settlement/index.js";
import { Router } from "express";
import { isLoggedIn } from "../../utils/middleware.js";
const router = Router();
router.get("/", [isLoggedIn], getSettlements);
router.get("/export", [isLoggedIn], exportSettlements);
export default router;
