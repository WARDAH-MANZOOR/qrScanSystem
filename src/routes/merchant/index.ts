import { Router } from "express";
import { merchantController } from "controller/index.js";
import { isLoggedIn, isAdmin } from "utils/middleware.js";

const router = Router();

// Define routes using arrow functions
router.get("/", [isLoggedIn, isAdmin], merchantController.getMerchants);
router.put("/", [isLoggedIn, isAdmin], merchantController.updateMerchant);

export default router;
