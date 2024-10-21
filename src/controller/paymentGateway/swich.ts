import { NextFunction, Request, Response } from "express";
import { swichService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";

const initiateSwichController = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      let merchantId = req.params?.merchantId;
  
    //   if (!merchantId) {
        // return res.status(400).json(ApiResponse.error("Merchant ID is required"));
    //   }
  
      const result = await swichService.initiateSwich(req.body);
      return res.status(200).json(ApiResponse.success(result));
    } catch (error) {
      next(error);
    }
  };

export default {initiateSwichController}