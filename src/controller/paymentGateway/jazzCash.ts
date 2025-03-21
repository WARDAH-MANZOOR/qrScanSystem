// src/controllers/paymentController.ts
import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { jazzCashService, transactionService } from "services/index.js";
import { checkTransactionStatus, getToken, initiateTransaction,simpleProductionMwTransactionClone, simpleProductionInitiateTransactionClone,initiateTransactionClone, mwTransaction, mwTransactionClone, simpleCheckTransactionStatus, simpleGetToken, simpleSandboxCheckTransactionStatus, simpleSandboxGetToken, simpleSandboxinitiateTransactionClone, simpleSandboxMwTransactionClone } from "../../services/paymentGateway/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
import CustomError from "../../utils/custom_error.js";

const initiateJazzCash = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentData = req.body;
    console.log("Payment Data: ", paymentData)

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
      return;
    }
    let merchantId = req.params?.merchantId;

    if (!merchantId) {
      res.status(400).json(ApiResponse.error("Merchant ID is required"));
      return;
    }

    const result: any = await jazzCashService.initiateJazzCashPayment(paymentData, merchantId);
    if (result.statusCode != "000") {
      res.status(result.statusCode != 500 ? result.statusCode : 201).send(ApiResponse.error(result, result.statusCode != 500 ? result.statusCode : 201));
      return;
    }
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const initiateJazzCashAsync = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
      return;
    }
    const paymentData = req.body;

    let merchantId = req.params?.merchantId;

    if (!merchantId) {
      res.status(400).json(ApiResponse.error("Merchant ID is required"));
      return;
    }

    const result: any = await jazzCashService.initiateJazzCashPaymentAsync(paymentData, merchantId);
    if (result.statusCode != "pending") {
      res.status(result?.statusCode).send(ApiResponse.error(result));
      return

    }
    res.status(200).json(ApiResponse.success(result));
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
  
    const query: any = req.query;
    const result = await jazzCashService.getJazzCashMerchant(query);
    res.status(200).json(ApiResponse.success(result));
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
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
    }
    const merchantData = req.body;
    const result = await jazzCashService.createJazzCashMerchant(merchantData);
    res.status(200).json(ApiResponse.success(result));
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
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
      return
    }
    const merchantId = parseInt(req.params.merchantId);
    const updateData = req.body;

    if (!merchantId) {
      res.status(400).json(ApiResponse.error("Merchant ID is required"));
      return

    }

    const result = await jazzCashService.updateJazzCashMerchant(merchantId, updateData);
    res.status(200).json(ApiResponse.success(result));
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
      res.status(400).json(ApiResponse.error("Merchant ID is required"));
      return

    }

    const result = await jazzCashService.deleteJazzCashMerchant(merchantId);
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const statusInquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.params.merchantId;
    const payload = req.body;
    if (!merchantId) {
      res.status(400).json(ApiResponse.error("Merchant ID is required"));
      return
    }
    const result = await jazzCashService.statusInquiry(payload, merchantId);
    res.status(200).json(ApiResponse.success(result,"",result.statusCode == 500 ? 201: 200));
  }
  catch (err) {
    next(err);
  }
};

const simpleStatusInquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.params.merchantId;
    const payload = req.body;
    if (!merchantId) {
      res.status(400).json(ApiResponse.error("Merchant ID is required"));
      return
    }
    const result = await jazzCashService.simpleStatusInquiry(payload, merchantId);
    res.status(200).json(ApiResponse.success(result,"",result.statusCode == 500 ? 201: 200));
  }
  catch (err) {
    next(err);
  }
};

const jazzStatusInquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.params.merchantId;
    const payload = req.body;
    if (!merchantId) {
      res.status(400).json(ApiResponse.error("Merchant ID is required"));
      return
    }
    const result = await jazzCashService.statusInquiry(payload, merchantId);
    res.status(200).json(ApiResponse.success(result,"",result.statusCode == 500 ? 201: 200));
  }
  catch (err) {
    next(err);
  }
};
const initiateDisbursment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("IBFT Called")
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    const token = await getToken(req.params.merchantId);
    const initTransaction = await initiateTransaction(token?.access_token, req.body, req.params.merchantId);
    res.status(200).json(ApiResponse.success(initTransaction));
  }
  catch (err) {
    next(err)
  }
}

const initiateMWDisbursement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    const token = await getToken(req.params.merchantId);
    const initTransaction = await mwTransaction(token?.access_token, req.body, req.params.merchantId);

    res.status(200).json(ApiResponse.success(initTransaction));
  }
  catch (err) {
    next(err)
  }
}

const initiateDisbursmentClone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("IBFT Called")
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    if (req.body.amount <= 1) {
      throw new CustomError("Amount should be greater than 0", 400);
    }
    const token = await getToken(req.params.merchantId);
    const initTransaction = await initiateTransactionClone(token?.access_token, req.body, req.params.merchantId);
    res.status(200).json(ApiResponse.success(initTransaction));
  }
  catch (err) {
    next(err)
  }
}

const initiateSandboxDisbursmentClone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("IBFT Called")
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    const token = await simpleSandboxGetToken(req.params.merchantId);
    if (!token?.access_token) {
      res.status(500).json(ApiResponse.error(token))
    }
    const initTransaction = await simpleSandboxinitiateTransactionClone(token?.access_token, req.body, req.params.merchantId);
    res.status(200).json(ApiResponse.success(initTransaction));
  }
  catch (err) {
    next(err)
  }
}

const initiateProductionDisbursmentClone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("IBFT Called")
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    const token = await getToken(req.params.merchantId);
    if (!token?.access_token) {
      res.status(500).json(ApiResponse.error(token))
    }
    const initTransaction = await simpleProductionInitiateTransactionClone(token?.access_token, req.body, req.params.merchantId);
    res.status(200).json(ApiResponse.success(initTransaction));
  }
  catch (err) {
    next(err)
  }
}

const initiateMWDisbursementClone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    if (req.body.amount <= 1) {
      throw new CustomError("Amount should be greater than 0", 400);
    }
    const token = await getToken(req.params.merchantId);
    const initTransaction = await mwTransactionClone(token?.access_token, req.body, req.params.merchantId);
    
    res.status(200).json(ApiResponse.success(initTransaction));
  }
  catch (err) {
    next(err)
  }
}

const initiateSandboxMWDisbursementClone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    const token = await simpleSandboxGetToken(req.params.merchantId);
    if (!token?.access_token) {
      res.status(500).json(ApiResponse.error(token));
    }
    const initTransaction = await simpleSandboxMwTransactionClone(token?.access_token, req.body, req.params.merchantId);
    
    res.status(200).json(ApiResponse.success(initTransaction));
  }
  catch (err) {
    next(err)
  }
}

const initiateProductionMWDisbursementClone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    const token = await getToken(req.params.merchantId);
    if (!token?.access_token) {
      res.status(500).json(ApiResponse.error(token));
    }
    const initTransaction = await simpleProductionMwTransactionClone(token?.access_token, req.body, req.params.merchantId);
    
    res.status(200).json(ApiResponse.success(initTransaction));
  }
  catch (err) {
    next(err)
  }
}

const dummyCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await jazzCashService.callback(req.body);
    res.status(200).send(result);
  }
  catch (err) {
    next(err);
  }
}

const disburseInquiryController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    const token = await getToken(req.params.merchantId);
    const inquiry = await checkTransactionStatus(token?.access_token, req.body, req.params.merchantId);
    res.status(200).json(ApiResponse.success(inquiry));
  }
  catch (err) {
    next(err)
  }
}

const simpleDisburseInquiryController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    const token = await simpleGetToken(req.params.merchantId);
    const inquiry = await simpleCheckTransactionStatus(token?.access_token, req.body, req.params.merchantId);
    res.status(200).json(ApiResponse.success(inquiry));
  }
  catch (err) {
    next(err)
  }
}

const simpleSandboxDisburseInquiryController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    const token = await simpleSandboxGetToken(req.params.merchantId);
    const inquiry = await simpleSandboxCheckTransactionStatus(token?.access_token, req.body, req.params.merchantId);
    res.status(200).json(ApiResponse.success(inquiry));
  }
  catch (err) {
    next(err)
  }
}

const initiateJazzCashCnic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentData = req.body;
    console.log("Payment Data: ", paymentData)

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
      return;
    }
    let merchantId = req.params?.merchantId;

    if (!merchantId) {
      res.status(400).json(ApiResponse.error("Merchant ID is required"));
      return;
    }

    const result: any = await jazzCashService.initiateJazzCashCnicPayment(paymentData, merchantId);
    if (result.statusCode != "000") {
      res.status(result.statusCode != 500 ? +result.statusCode : 201).send(ApiResponse.error(result, result.statusCode != 500 ? +result.statusCode : 201));
      return;
    }
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

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
  disburseInquiryController,
  simpleDisburseInquiryController,
  initiateJazzCashAsync,
  jazzStatusInquiry,
  initiateJazzCashCnic,
  initiateDisbursmentClone,
  initiateMWDisbursementClone,
  initiateSandboxMWDisbursementClone,
  initiateSandboxDisbursmentClone,
  simpleSandboxDisburseInquiryController,
  simpleStatusInquiry,
  initiateProductionMWDisbursementClone,
  initiateProductionDisbursmentClone
};