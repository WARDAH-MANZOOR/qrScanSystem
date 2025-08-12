import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import { easyPaisaService, payfast, swichService, transactionService } from "../../services/index.js";
import type { DisbursementPayload } from "../../types/providers.js";
import ApiResponse from "../../utils/ApiResponse.js";
import CustomError from "../../utils/custom_error.js";
import prisma from "../../prisma/client.js";
const initiateEasyPaisaNewFlow = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let merchantId = req.params?.merchantId;
    const decryptedPayload = req.body.decryptedPayload;

    if (!decryptedPayload) {
      res.status(400).json(ApiResponse.error("Decrypted payload not found"));
      return;
    }
    if (!merchantId) {
      res.status(400).json(ApiResponse.error("Merchant ID is required"));
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string));
      return;
    }

    const channel = (await transactionService.getMerchantChannel(merchantId))?.easypaisaPaymentMethod;
    let result: any;
    if (channel == "DIRECT") {
      result = await easyPaisaService.initiateEasyPaisa(
        merchantId,
        decryptedPayload
      );
      if (result.statusCode != "0000") {
        await prisma.failedAttempt.create({ data: { phoneNumber: decryptedPayload.phone } });
        res.status(result.statusCode != 500 ? result.statusCode : 201).send(ApiResponse.error(result, result.statusCode != 500 ? result.statusCode : 201))
        return;
      }
    }
    else if (channel == "SWITCH") {
      result = await swichService.initiateSwich({
        channel: 1749,
        amount: decryptedPayload.amount,
        phone: transactionService.convertPhoneNumber(decryptedPayload.phone),
        email: decryptedPayload.email,
        order_id: decryptedPayload.order_id,
        type: decryptedPayload.type
      }, merchantId)
      if (result.statusCode != "0000") {
        await prisma.failedAttempt.create({ data: { phoneNumber: decryptedPayload.phone } });
        res.status(result.statusCode != 500 ? result.statusCode : 201).send(ApiResponse.error(result, result.statusCode != 500 ? result.statusCode : 201));
        return;
      }
    }
    else {
      console.log(JSON.stringify({ event: "PAYFAST_PAYIN_INITIATED", order_id: decryptedPayload.order_id, body: decryptedPayload }))
      const token = await payfast.getApiToken(req.params.merchantId, decryptedPayload);
      if (!token?.token) {
        console.log(JSON.stringify({ event: "PAYFAST_PAYIN_NO_TOKEN_RECIEVED", order_id: decryptedPayload.order_id }))
        throw new CustomError("No Token Recieved", 500);
      }
      const validation = await payfast.validateCustomerInformation(req.params.merchantId, {
        token: token?.token,
        bankCode: '13',
        ...decryptedPayload
      })
      if (!validation?.transaction_id) {
        console.log(JSON.stringify({ event: "PAYFAST_PAYIN_VALIDATION_FAILED", order_id: decryptedPayload.order_id }))
        res.status(500).send(ApiResponse.error(result, 500))
        return;
      }
      result = await payfast.pay(req.params.merchantId, {
        token: token?.token,
        bankCode: '13',
        transaction_id: validation?.transaction_id,
        ...decryptedPayload
      })
      if (result?.statusCode != "0000") {
        await prisma.failedAttempt.create({ data: { phoneNumber: decryptedPayload.phone } });
        console.log(JSON.stringify({ event: "PAYFAST_PAYIN_RESPONSE", order_id: decryptedPayload.order_id, response: result }))
        res.status(result.statusCode != 500 ? result.statusCode : 201).send(ApiResponse.error(result, result.statusCode != 500 ? result.statusCode : 201))
        return;
      }
    }
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};
const initiateEasyPaisa = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let merchantId = req.params?.merchantId;

    if (!merchantId) {
      res.status(400).json(ApiResponse.error("Merchant ID is required"));
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string));
      return;
    }

    const channel = (await transactionService.getMerchantChannel(merchantId))?.easypaisaPaymentMethod;
    let result: any;
    if (channel == "DIRECT") {
      result = await easyPaisaService.initiateEasyPaisa(
        merchantId,
        req.body
      );
      if (result.statusCode != "0000") {
        await prisma.failedAttempt.create({ data: { phoneNumber: req.body.phone } });
        res.status(result.statusCode != 500 ? result.statusCode : 201).send(ApiResponse.error(result, result.statusCode != 500 ? result.statusCode : 201))
        return;
      }
    }
    else if (channel == "SWITCH") {
      result = await swichService.initiateSwich({
        channel: 1749,
        amount: req.body.amount,
        phone: transactionService.convertPhoneNumber(req.body.phone),
        email: req.body.email,
        order_id: req.body.order_id,
        type: req.body.type
      }, merchantId)
      if (result.statusCode != "0000") {
        await prisma.failedAttempt.create({ data: { phoneNumber: req.body.phone } });
        res.status(result.statusCode != 500 ? result.statusCode : 201).send(ApiResponse.error(result, result.statusCode != 500 ? result.statusCode : 201));
        return;
      }
    }
    else {
      console.log(JSON.stringify({ event: "PAYFAST_PAYIN_INITIATED", order_id: req.body.order_id, body: req.body }))
      const token = await payfast.getApiToken(req.params.merchantId, req.body);
      if (!token?.token) {
        console.log(JSON.stringify({ event: "PAYFAST_PAYIN_NO_TOKEN_RECIEVED", order_id: req.body.order_id }))
        throw new CustomError("No Token Recieved", 500);
      }
      const validation = await payfast.validateCustomerInformation(req.params.merchantId, {
        token: token?.token,
        bankCode: '13',
        ...req.body
      })
      if (!validation?.transaction_id) {
        await prisma.failedAttempt.create({ data: { phoneNumber: req.body.phone } });
        console.log(JSON.stringify({ event: "PAYFAST_PAYIN_VALIDATION_FAILED", order_id: req.body.order_id }))
        res.status(500).send(ApiResponse.error(validation.response_message, 500))
        return;
      }
      result = await payfast.pay(req.params.merchantId, {
        token: token?.token,
        bankCode: '13',
        transaction_id: validation?.transaction_id,
        ...req.body
      })
      if (result?.statusCode != "0000") {
        await prisma.failedAttempt.create({ data: { phoneNumber: req.body.phone } });
        console.log(JSON.stringify({ event: "PAYFAST_PAYIN_RESPONSE", order_id: req.body.order_id, response: result }))
        res.status(result.statusCode != 500 ? result.statusCode : 201).send(ApiResponse.error(result, result.statusCode != 500 ? result.statusCode : 201))
        return;
      }
    }
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const initiateEasyPaisaAsync = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let merchantId = req.params?.merchantId;

    if (!merchantId) {
      res.status(400).json(ApiResponse.error("Merchant ID is required"));
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string));
      return;
    }

    const channel = (await transactionService.getMerchantChannel(merchantId))?.easypaisaPaymentMethod;
    let result: any;
    if (channel == "DIRECT") {
      result = await easyPaisaService.initiateEasyPaisaAsync(
        merchantId,
        req.body
      );
      if (result.statusCode != "pending") {
        await prisma.failedAttempt.create({ data: { phoneNumber: req.body.phone } });
        res.status(result.statusCode).send(ApiResponse.error(result))
        return;
      }
    }
    else if (channel == "SWITCH") {
      result = await swichService.initiateSwichAsync({
        channel: 1749,
        amount: req.body.amount,
        phone: transactionService.convertPhoneNumber(req.body.phone),
        email: req.body.email,
        order_id: req.body.order_id,
        type: req.body.type
      }, merchantId)
      if (result.statusCode != "pending") {
        await prisma.failedAttempt.create({ data: { phoneNumber: req.body.phone } });
        res.status(result.statusCode).send(ApiResponse.error(result));
        return;
      }
    }
    else {
      console.log(JSON.stringify({ event: "PAYFAST_ASYNC_INITIATED", order_id: req.body.order_id, body: req.body }))

      const token = await payfast.getApiToken(req.params.merchantId, req.body);
      if (!token?.token) {
        console.log(JSON.stringify({ event: "PAYFAST_ASYNC_NO_TOKEN_RECIEVED", order_id: req.body.order_id }))

        throw new CustomError("No Token Recieved", 500);
      }
      const validation = await payfast.validateCustomerInformation(req.params.merchantId, {
        token: token?.token,
        bankCode: '13',
        ...req.body
      })
      if (!validation?.transaction_id) {
        await prisma.failedAttempt.create({ data: { phoneNumber: req.body.phone } });
        console.log(JSON.stringify({ event: "PAYFAST_ASYNC_VALIDATION_FAILED", order_id: req.body.order_id }))

        res.status(500).send(ApiResponse.error(result, 500))
        return;
      }
      result = await payfast.payAsync(req.params.merchantId, {
        token: token?.token,
        bankCode: '13',
        transaction_id: validation?.transaction_id,
        ...req.body
      })
      console.log(JSON.stringify({ event: "PAYFAST_ASYNC_RESPONSE", order_id: req.body.order_id, response: result }))
      if (result?.statusCode != "pending") {
        await prisma.failedAttempt.create({ data: { phoneNumber: req.body.phone } });
        res.status(result.statusCode).send(ApiResponse.error(result, result.statusCode))
        return;
      }
    }
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const initiateEasyPaisaClone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let merchantId = req.params?.merchantId;

    if (!merchantId) {
      res.status(400).json(ApiResponse.error("Merchant ID is required"));
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string));
      return;
    }

    const channel = (await transactionService.getMerchantChannel(merchantId))?.easypaisaPaymentMethod;
    let result: any;
    if (channel == "DIRECT") {
      result = await easyPaisaService.initiateEasyPaisaClone(
        merchantId,
        req.body
      );
      if (result.statusCode != "0000") {
        await prisma.failedAttempt.create({ data: { phoneNumber: req.body.phone } });
        res.status(result.statusCode != 500 ? result.statusCode : 201).send(ApiResponse.error(result, result.statusCode != 500 ? result.statusCode : 201))
        return;
      }
    }
    else {
      result = await swichService.initiateSwichClone({
        channel: 1749,
        amount: req.body.amount,
        phone: transactionService.convertPhoneNumber(req.body.phone),
        email: req.body.email,
        order_id: req.body.order_id,
        type: req.body.type
      }, merchantId)
      console.log("result: ", result)
      if (!result?.statusCode && result?.statusCode != "0000") {
        await prisma.failedAttempt.create({ data: { phoneNumber: req.body.phone } });
        res.status(result?.statusCode != 500 ? result?.statusCode : 201).send(ApiResponse.error(result, result?.statusCode != 500 ? result?.statusCode : 201));
        return;
      }
    }
    console.log("Result:", result)
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const initiateEasyPaisaAsyncClone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let merchantId = req.params?.merchantId;

    if (!merchantId) {
      res.status(400).json(ApiResponse.error("Merchant ID is required"));
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string));
      return;
    }

    const channel = (await transactionService.getMerchantChannel(merchantId))?.easypaisaPaymentMethod;
    let result: any;
    if (channel == "DIRECT") {
      result = await easyPaisaService.initiateEasyPaisaAsyncClone(
        merchantId,
        req.body
      );
      if (result.statusCode != "pending") {
        await prisma.failedAttempt.create({ data: { phoneNumber: req.body.phone } });
        res.status(result.statusCode).send(ApiResponse.error(result))
        return;
      }
    }
    else if (channel == "SWITCH") {
      result = await swichService.initiateSwichAsyncClone({
        channel: 1749,
        amount: req.body.amount,
        phone: transactionService.convertPhoneNumber(req.body.phone),
        email: req.body.email,
        order_id: req.body.order_id,
        type: req.body.type
      }, merchantId)
      if (result.statusCode != "pending") {
        await prisma.failedAttempt.create({ data: { phoneNumber: req.body.phone } });
        res.status(result.statusCode).send(ApiResponse.error(result));
        return;
      }
    }
    else {
      console.log(JSON.stringify({ event: "PAYFAST_ASYNC_INITIATED", order_id: req.body.order_id, body: req.body }))
      const token = await payfast.getApiToken(req.params.merchantId, req.body);
      if (!token?.token) {
        console.log(JSON.stringify({ event: "PAYFAST_ASYNC_NO_TOKEN_RECIEVED", order_id: req.body.order_id }))
        throw new CustomError("No Token Recieved", 500);
      }
      const validation = await payfast.validateCustomerInformation(req.params.merchantId, {
        token: token?.token,
        bankCode: '31',
        ...req.body
      })
      if (!validation?.transaction_id) {
        console.log(JSON.stringify({ event: "PAYFAST_ASYNC_VALIDATION_FAILED", order_id: req.body.order_id }))
        res.status(500).send(ApiResponse.error(result, 500))
        return;
      }
      result = await payfast.payAsyncClone(req.params.merchantId, {
        token: token?.token,
        bankCode: '31',
        transaction_id: validation?.transaction_id,
        ...req.body
      })
      console.log(JSON.stringify({ event: "PAYFAST_ASYNC_RESPONSE", order_id: req.body.order_id, response: result }))
      if (result?.statusCode != "pending") {
        await prisma.failedAttempt.create({ data: { phoneNumber: req.body.phone } });
        await prisma.failedAttempt.create({ data: { phoneNumber: req.body.phone } });
        res.status(result.statusCode).send(ApiResponse.error(result, result.statusCode))
        return;
      }
    }
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const getEasyPaisaMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchantId = req.params.merchantId;
    const merchant = await easyPaisaService.getMerchant(merchantId);
    res.status(200).json(ApiResponse.success(merchant));
  } catch (error) {
    next(error);
  }
};

const createEasyPaisaMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string));
      return;
    }
    const newMerchant = await easyPaisaService.createMerchant(req.body);
    res.status(201).json(ApiResponse.success(newMerchant));
  } catch (error) {
    next(error);
  }
};

const updateEasyPaisaMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string));
      return;
    }
    const merchantId = req.params.merchantId;
    const updatedMerchant = await easyPaisaService.updateMerchant(
      merchantId,
      req.body
    );
    if (!updatedMerchant) {
      res.status(404).json(ApiResponse.error("Merchant not found"));
      return;
    }
    res.status(200).json(ApiResponse.success(updatedMerchant));
  } catch (error) {
    next(error);
  }
};

const deleteEasyPaisaMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string));
      return;
    }
    const merchantId = req.params.merchantId;
    const deletedMerchant = await easyPaisaService.deleteMerchant(merchantId);
    if (!deletedMerchant) {
      res.status(404).json(ApiResponse.error("Merchant not found"));
      return;
    }
    res
      .status(200)
      .json(ApiResponse.success({ message: "Merchant deleted successfully" }));
  } catch (error) {
    next(error);
  }
};

const statusInquiry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string));
      return;
    }
    const merchantId = req.params.merchantId;
    const payload = req.query;
    if (!merchantId) {
      res.status(400).json(ApiResponse.error("Merchant ID is required"));
      return;
    }
    const channel = (await transactionService.getMerchantChannel(merchantId))?.easypaisaPaymentMethod;
    const method = (await transactionService.getMerchantInquiryMethod(merchantId))?.easypaisaInquiryMethod;
    let result;
    console.log(req.ip)
    console.log("channel: ", channel == "DIRECT")
    if (method == "WALLET") {
      if (channel == "DIRECT") {
        result = await easyPaisaService.easypaisainquiry(req.query, merchantId);
      }
      else {
        result = await swichService.swichTxInquiry(
          req.query.orderId as string,
          merchantId as string
        );
      }
    }
    else {
      result = await transactionService.getTransaction(merchantId as string, req.query.orderId as string)
    }
    // const result = await easyPaisaService.easypaisainquiry(payload, merchantId);
    res.status(201).json(ApiResponse.success(result));
  } catch (err) {
    next(err);
  }
};

const createDisbursement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchantId = req.params?.merchantId;
    const payload: DisbursementPayload = req.body;
    const result = await easyPaisaService.createDisbursement(payload, merchantId);
    res.status(200).json(ApiResponse.success(result));
  } catch (err) {
    next(err);
  }
}

const createDisbursementClone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchantId = req.params?.merchantId;
    const payload: DisbursementPayload = req.body;
    if (payload.amount <= 1) {
      throw new CustomError("Amount should be greater than 0", 400);
    }
    const result = await easyPaisaService.createDisbursementClone(payload, merchantId);
    res.status(200).json(ApiResponse.success(result));
  } catch (err) {
    next(err);
  }
}

const getDisbursement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req;
    const id = (req.user as JwtPayload)?.merchant_id || query.merchant_id;
    const merchant = await easyPaisaService.getDisbursement(id, query);
    res.status(200).json(ApiResponse.success(merchant));
  } catch (error) {
    next(error);
  }
}

const getDisbursementWithinRange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req;
    const id = (req.user as JwtPayload)?.merchant_id || query.merchant_id;
    const merchant = await easyPaisaService.getTeleDisbursementLast15MinsFromLast10Mins(query);
    res.status(200).json(ApiResponse.success(merchant));
  } catch (error) {
    next(error);
  }
}

const exportDisbursement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req;
    const id = (req.user as JwtPayload)?.merchant_id || query.merchant_id;
    const merchant = await easyPaisaService.exportDisbursement(id, query);
    res.status(200).json(merchant)
  } catch (error) {
    next(error);
  }
}

const disburseThroughBank = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = req.params?.merchantId;
    const payload: DisbursementPayload = req.body;
    const result = await easyPaisaService.disburseThroughBank(payload, merchantId);
    res.status(200).json(ApiResponse.success(result));
  }
  catch (err) {
    next(err);
  }
}

const disburseThroughBankClone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchantId = req.params?.merchantId;
    const payload: DisbursementPayload = req.body;
    if (payload.amount <= 1) {
      throw new CustomError("Amount should be greater than 0", 400);
    }
    const result = await easyPaisaService.disburseThroughBankClone(payload, merchantId);
    res.status(200).json(ApiResponse.success(result));
  }
  catch (err) {
    next(err);
  }
}

const accountBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchantId = req.params?.merchantId;
    const result = await easyPaisaService.accountBalance(merchantId);
    res.status(200).json(ApiResponse.success(result));
  } catch (err) {
    next(err);
  }
}


const transactionInquiry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const merchantId = req.params?.merchantId;
    const payload = req?.body;
    const result = await easyPaisaService.transactionInquiry(payload, merchantId);
    res.status(200).json(ApiResponse.success(result));
  } catch (err) {
    next(err);
  }
}

export default {
  initiateEasyPaisa,
  initiateEasyPaisaNewFlow,
  getEasyPaisaMerchant,
  createEasyPaisaMerchant,
  updateEasyPaisaMerchant,
  deleteEasyPaisaMerchant,
  statusInquiry,
  createDisbursement,
  getDisbursement,
  disburseThroughBank,
  initiateEasyPaisaAsync,
  accountBalance,
  transactionInquiry,
  exportDisbursement,
  createDisbursementClone,
  disburseThroughBankClone,
  initiateEasyPaisaClone,
  initiateEasyPaisaAsyncClone,
  getDisbursementWithinRange
};
