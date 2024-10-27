import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
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
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
    }
    const queryParameters = req.query;
    const user = req.user as JwtPayload;
    const result = await dashboardService.merchantDashboardDetails(
      queryParameters,
      user
    );
    return res.status(200).json(ApiResponse.success(result));
  } catch (error: any) {
    return res.status(400).json(ApiResponse.error(error?.message, error?.statusCode));
  }
};

const adminDashboardDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
    }
    const queryParameters = req.query;
    const result = await dashboardService.adminDashboardDetails(
      queryParameters
    );
    return res.status(200).json(ApiResponse.success(result));
  } catch (error: any) {
    return res.status(400).json(ApiResponse.error(error?.message, error?.statusCode));
  }
};

export default { merchantDashboardDetails, adminDashboardDetails };
