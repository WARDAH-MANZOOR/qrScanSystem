import { Router } from "express";
import { dashboardController } from "controller/index.js";
import { isLoggedIn, isAdmin } from "utils/middleware.js";

const router = Router();

// Define routes using arrow functions
router.get("/merchant", [isAdmin], dashboardController.adminDashboardDetails);
router.get("/admin", dashboardController.merchantDashboardDetails);

// Globally apply middleware to all routes
router.use(isLoggedIn);

export default router;
