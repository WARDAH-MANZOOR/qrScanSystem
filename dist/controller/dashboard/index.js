import { validationResult } from "express-validator";
import { dashboardService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
const merchantDashboardDetails = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json(ApiResponse.error(errors.array()[0]));
            return;
        }
        const queryParameters = req.query;
        const user = req.user;
        const result = await dashboardService.merchantDashboardDetails(queryParameters, user);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        res.status(400).json(ApiResponse.error(error?.message, error?.statusCode));
    }
};
const adminDashboardDetails = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json(ApiResponse.error(errors.array()[0]));
            return;
        }
        const queryParameters = req.query;
        const result = await dashboardService.adminDashboardDetails(queryParameters);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        res.status(400).json(ApiResponse.error(error?.message, error?.statusCode));
    }
};
export default { merchantDashboardDetails, adminDashboardDetails };
