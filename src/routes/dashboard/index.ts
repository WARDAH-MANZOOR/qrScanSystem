import { Router } from "express";
import { dashboardController } from "controller/index.js";
import { isLoggedIn, isAdmin } from "utils/middleware.js";

const router = Router();

// Define routes using arrow functions
/**
 * @swagger
 * /dashboard/merchant/:
 *   get:
 *     summary: Retrieve the dashboard summary for the authenticated merchant.
 *     description: Returns various transaction aggregates such as counts and sums for displaying on the dashboard.
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful response containing the dashboard summary.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 todayCount:
 *                   type: integer
 *                   description: Number of transactions made today.
 *                   example: 15
 *                 last30DaysCount:
 *                   type: integer
 *                   description: Number of transactions in the last 30 days.
 *                   example: 450
 *                 totalCount:
 *                   type: integer
 *                   description: Total number of transactions.
 *                   example: 1200
 *                 todaySum:
 *                   type: number
 *                   format: float
 *                   description: Total settled amount for today.
 *                   example: 1500.75
 *                 currentYearSum:
 *                   type: number
 *                   format: float
 *                   description: Total settled amount for the current year.
 *                   example: 50000.00
 *                 statusCounts:
 *                   type: array
 *                   description: Array of transaction counts grouped by status.
 *                   items:
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                         description: Transaction status.
 *                         example: "COMPLETED"
 *                       _count:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: integer
 *                             description: Count of transactions with this status.
 *                             example: 300
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token.
 *       500:
 *         description: Internal server error.
 */
router.get("/merchant",  dashboardController.merchantDashboardDetails);
router.get("/admin", [isLoggedIn, isAdmin], dashboardController.adminDashboardDetails);

// Globally apply middleware to all routes
router.use(isLoggedIn);

export default router;
