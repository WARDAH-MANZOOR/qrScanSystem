import { getSettlements } from "controller/settlement/index.js";
import { Router } from "express";
import { isLoggedIn } from "utils/middleware.js";

const router = Router();

router.get("/", [isLoggedIn], getSettlements);

export default router;