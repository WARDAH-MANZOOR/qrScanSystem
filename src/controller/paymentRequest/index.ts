import { NextFunction, Request, Response } from "express";
import { paymentRequestService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
import CustomError from "utils/custom_error.js";

const createPaymentRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await paymentRequestService.createPaymentRequest(
      req.body,
      req.user
    );
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const getPaymentRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    req.query.user = req.user;
    const result = await paymentRequestService.getPaymentRequest(req.query);
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const updatePaymentRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params?.paymentRequestId;
    const user = req?.user;

    if (!id) {
      throw new CustomError("Payment request ID is required", 400);
    }

    // body must not be empty
    if (!Object.keys(req.body).length) {
      throw new CustomError("Request body is required", 400);
    }

    const result = await paymentRequestService.updatePaymentRequest(
      id,
      req.body,
      user
    );
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const getPaymentRequestbyId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params?.id;

    if (!id) {
      throw new CustomError("Payment request ID is required", 400);
    }

    const result = await paymentRequestService.getPaymentRequestbyId(
      id as string
    );
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const deletePaymentRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentRequestId = req.params?.paymentRequestId;

    if (!paymentRequestId) {
      throw new CustomError("Payment request ID is required", 400);
    }

    const result = await paymentRequestService.deletePaymentRequest(
      paymentRequestId
    );
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const payRequestedPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentRequestId = req.params?.paymentRequestId;

    if (!paymentRequestId) {
      throw new CustomError("Payment request ID is required", 400);
    }

    const result = await paymentRequestService.payRequestedPayment(
      paymentRequestId
    );
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

export default {
  createPaymentRequest,
  getPaymentRequest,
  updatePaymentRequest,
  deletePaymentRequest,
  payRequestedPayment,
  getPaymentRequestbyId,
};
