import { getDashboardSummary } from "controller/transactions/analytics.js";
import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "jsonwebtoken";
import { merchantService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";

const merchantDashboardDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const queryParameters = req.query;
    let data = await getDashboardSummary((req.user as JwtPayload)?.id)
    res.status(200).json(data);
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
  } catch (error) {
    next(error);
  }
};

export default { merchantDashboardDetails, adminDashboardDetails };
