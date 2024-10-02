import { Router } from "express";
import { dashboardController } from "controller/index.js";
import { isLoggedIn, isAdmin } from "utils/middleware.js";

const router = Router();

// Define routes using arrow functions
router.get("/merchant",  dashboardController.merchantDashboardDetails);
router.get("/admin", [isAdmin],dashboardController.adminDashboardDetails);

// Globally apply middleware to all routes
router.use(isLoggedIn);

export default router;
