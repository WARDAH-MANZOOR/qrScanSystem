import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { swichService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";

const initiateSwichController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
    }
    let merchantId = req.params?.merchantId;

    if (!merchantId) {
      return res.status(400).json(ApiResponse.error("Merchant ID is required"));
    }
    const result = await swichService.initiateSwich(req.body, merchantId);
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const getSwichMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const merchantId = req.params.merchantId;
    const merchant = await swichService.getMerchant(merchantId);
    return res.status(200).json(ApiResponse.success(merchant));
  } catch (error) {
    next(error);
  }
};

const createSwichMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
    }
    const newMerchant = await swichService.createMerchant(req.body);
    return res.status(201).json(ApiResponse.success(newMerchant));
  } catch (error) {
    next(error);
  }
};

const updateSwichMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
    }
    const merchantId = req.params.merchantId;
    const updatedMerchant = await swichService.updateMerchant(
      merchantId,
      req.body
    );
    if (!updatedMerchant) {
      return res.status(404).json(ApiResponse.error("Merchant not found"));
    }
    return res.status(200).json(ApiResponse.success(updatedMerchant));
  } catch (error) {
    next(error);
  }
};

const deleteSwichMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
    }
    const merchantId = req.params.merchantId;
    const deletedMerchant = await swichService.deleteMerchant(merchantId);
    if (!deletedMerchant) {
      return res.status(404).json(ApiResponse.error("Merchant not found"));
    }
    return res
      .status(200)
      .json(ApiResponse.success({ message: "Merchant deleted successfully" }));
  } catch (error) {
    next(error);
  }
};

const swichTxInquiry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
    }
    const { transactionId } = req.query;
    const { merchantId } = req.params;

    if (!transactionId) {
      return res
        .status(400)
        .json(ApiResponse.error("Transaction ID is required"));
    }

    if (!merchantId) {
      return res.status(400).json(ApiResponse.error("Merchant ID is required"));
    }

    const transaction = await swichService.swichTxInquiry(
      transactionId as string,
      merchantId as string
    );

    return res.status(200).json(ApiResponse.success(transaction));
  } catch (error) {
    next(error);
  }
};

export default {
  initiateSwichController,
  createSwichMerchant,
  getSwichMerchant,
  updateSwichMerchant,
  deleteSwichMerchant,
  swichTxInquiry,
};
