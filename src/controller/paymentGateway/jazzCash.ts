// src/controllers/paymentController.ts
import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { jazzCashService } from "services/index.js";
import { checkTransactionStatus, getToken, initiateTransaction, mwTransaction } from "services/paymentGateway/index.js";
import ApiResponse from "utils/ApiResponse.js";
import CustomError from "utils/custom_error.js";

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

    let merchantId = req.params?.merchantId;

    if (!merchantId) {
      return res.status(400).json(ApiResponse.error("Merchant ID is required"));
    }

    const result: any = await jazzCashService.initiateJazzCashPayment(paymentData, merchantId);
    if (result.statusCode != "000") {
      return res.status(result?.statusCode).send(ApiResponse.error(result));
    }
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
    if (!merchantId) {
      return res.status(400).json(ApiResponse.error("Merchant ID is required"));
    }
    const result = await jazzCashService.statusInquiry(payload, merchantId);
    return res.status(200).json(ApiResponse.success(result));
  }
  catch (err) {
    next(err);
  }
};

const initiateDisbursment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    const token = await getToken();
    const initTransaction = await initiateTransaction(token?.access_token, req.body);
    return res.status(200).json(ApiResponse.success(initTransaction));
  }
  catch (err) {
    next(err)
  }
}

const initiateMWDisbursement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    const token = await getToken();
    const initTransaction = await mwTransaction(token?.access_token, req.body);
    return res.status(200).json(ApiResponse.success(initTransaction));
  }
  catch (err) {
    next(err)
  }
}

const dummyCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = jazzCashService.callback(req.body);
    return res.status(200).send(result);
  }
  catch (err) {
    next(err);
  }
}

const disburseInquiryController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    const token = await getToken();
    const inquiry = await checkTransactionStatus(token?.access_token, req.body);
    return res.status(200).json(ApiResponse.success(inquiry));
  }
  catch (err) {
    next(err)
  }
}

export default {
  initiateJazzCash,
  getJazzCashMerchant,
  createJazzCashMerchant,
  updateJazzCashMerchant,
  deleteJazzCashMerchant,
  statusInquiry,
  initiateDisbursment,
  initiateMWDisbursement,
  dummyCallback,
  disburseInquiryController
};
