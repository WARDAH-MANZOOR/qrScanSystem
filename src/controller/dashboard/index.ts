import { Request, Response, NextFunction } from "express";
import { merchantService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";

const merchantDashboardDetails = async (
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
