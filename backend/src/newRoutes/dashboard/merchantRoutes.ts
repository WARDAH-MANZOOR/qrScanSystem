import { Router } from "express";
import { dashboardController } from "../../controller/index.js";
import { isLoggedIn, authorize } from "../../utils/middleware.js";
import {
  merchantDashboardValidation,
} from "../../validators/dashboard/index.js";

const merchantRoutes = Router();

// Define routes using arrow functions
merchantRoutes.get(
  "/merchant",
  [isLoggedIn, ...merchantDashboardValidation],
  authorize("Dashboard"),
  dashboardController.merchantDashboardDetails
);

// Globally apply middleware to all routes
merchantRoutes.use(isLoggedIn);


export default merchantRoutes;
