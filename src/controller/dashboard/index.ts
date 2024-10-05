import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "jsonwebtoken";
import { merchantService } from "services/index.js";
import { dashboardService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";

const merchantDashboardDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const queryParameters = req.query;
    const user = req.user as JwtPayload;
    const result = await dashboardService.merchantDashboardDetails(
      queryParameters,
      user
    );
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const adminDashboardDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const queryParameters = req.query;
    const result = await dashboardService.adminDashboardDetails(
      queryParameters
    );
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

export default { merchantDashboardDetails, adminDashboardDetails };
