// src/controllers/paymentController.ts
import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { jazzCashService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";

const initiateJazzCash = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
    }
    const paymentData = req.body;

    if(!paymentData.order_id) {
      return res.status(400).json(ApiResponse.error("Order ID is required"));
    }
    
    let merchantId = req.params?.merchantId;

    if (!merchantId) {
      return res.status(400).json(ApiResponse.error("Merchant ID is required"));
    }

    const result: any = await jazzCashService.initiateJazzCashPayment(paymentData, merchantId);
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const getJazzCashMerchant = async ( 
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
    // }
    const query: any = req.query;
    const result = await jazzCashService.getJazzCashMerchant(query);
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
}

const createJazzCashMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
    }
    const merchantData = req.body;
    const result = await jazzCashService.createJazzCashMerchant(merchantData);
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
}

const updateJazzCashMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
    }
    const merchantId = parseInt(req.params.merchantId);
    const updateData = req.body;

    if (!merchantId) {
      return res.status(400).json(ApiResponse.error("Merchant ID is required"));
    }

    const result = await jazzCashService.updateJazzCashMerchant(merchantId, updateData);
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const deleteJazzCashMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const merchantId = parseInt(req.params.merchantId);

    if (!merchantId) {
      return res.status(400).json(ApiResponse.error("Merchant ID is required"));
    }

    const result = await jazzCashService.deleteJazzCashMerchant(merchantId);
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const statusInquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.params.merchantId;
    const payload = req.body;
    if(!merchantId) {
      return res.status(400).json(ApiResponse.error("Merchant ID is required"));
    }
    const result = await jazzCashService.statusInquiry(payload,merchantId);
    return res.status(200).json(ApiResponse.success(result));
  }
  catch(err) {
    next(err);
  }
};

export default {
  initiateJazzCash,
  getJazzCashMerchant,
  createJazzCashMerchant,
  updateJazzCashMerchant,
  deleteJazzCashMerchant,
  statusInquiry
};
