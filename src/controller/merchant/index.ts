import { Request, Response, NextFunction } from "express";
import { merchantService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";

const updateMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const payload = req.body;
    const result = await merchantService.updateMerchant(payload);
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const getMerchants = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const queryParameters = req.query;
    const result = await merchantService.getMerchants(queryParameters);
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const addMerchant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    const result = await merchantService.addMerchant(payload);
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};
export default { updateMerchant, getMerchants, addMerchant };
