import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { merchantService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
import CustomError from "utils/custom_error.js";

const updateMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(404).json(ApiResponse.error(errors.array()[0] as unknown as string))
    }
    const payload = req.body;
    const result = await merchantService.updateMerchant(payload);
    return res.status(200).json(ApiResponse.success(result));
  } catch (error: any) {
    res.status(error.statusCode).send(ApiResponse.error(error.message))
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
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(404).json(ApiResponse.error(errors.array()[0] as unknown as string))
    }
    const payload = req.body;
    const result = await merchantService.addMerchant(payload);
    if (result == "Settlment Duration Required") {
      throw new CustomError(result,400)
    }
    return res.status(200).json(ApiResponse.success(result));
  } catch (error: any) {
    return res.status(error.statusCode).send(ApiResponse.error(error.message));
  }
};
export default { updateMerchant, getMerchants, addMerchant };
