import { Router } from "express";
import { dashboardController } from "../../controller/index.js";
import { isLoggedIn, isAdmin } from "../../utils/middleware.js";
import { adminDashboardValidation, } from "../../validators/dashboard/index.js";
const adminRoutes = Router();
adminRoutes.get("/admin", [isLoggedIn, isAdmin, ...adminDashboardValidation], dashboardController.adminDashboardDetails);
// Globally apply middleware to all routes
adminRoutes.use(isLoggedIn);
export default adminRoutes;
