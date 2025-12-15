import { NextFunction, Request, Response } from "express";
import { paymentRequestService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
import CustomError from "../../utils/custom_error.js";
import { validateLocation } from "utils/geo.js";
import { maskPhone, normalizeE164 } from "utils/phone.js";
import prisma from "prisma/client.js";
import { OTP_PROVIDER } from "constants/otp.js";
import { createFirstTimeChallenge } from "services/otp/index.js";

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
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const createPaymentRequestClone = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await paymentRequestService.createPaymentRequestClone(
      req.body,
      req.params.merchantId
    );
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const createPaymentRequestForQR = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await paymentRequestService.createPaymentRequestForQR(
      req.body,
      req.params.merchantId
    );
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const createPaymentRequestWithOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await paymentRequestService.createPaymentRequestWithOtp(
      req.body,
      req.params.merchantId
    );
    if (result.status == 400) {
      throw new CustomError(result.message, result.status)
    }
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const createPaymentRequestWithOtpClone = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await paymentRequestService.createPaymentRequestWithOtpClone(
      req.body,
      req.params.merchantId
    );
    if (result.status == 400) {
      throw new CustomError(result.message, result.status)
    }
    res.status(200).json(ApiResponse.success(result));
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
    res.status(200).json(ApiResponse.success(result));
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
    res.status(200).json(ApiResponse.success(result));
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
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const getPaymentRequestbyTxnId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params?.id;

    if (!id) {
      throw new CustomError("Payment request ID is required", 400);

    }

    const result = await paymentRequestService.getPaymentRequestbyTxnId(
      id as string
    );
    res.status(200).json(ApiResponse.success(result));
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
    res.status(200).json(ApiResponse.success(result));
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

    if (!req.body.payId) {
      throw new CustomError("Payment request ID is required", 400);
    }

    if (!req.body.accountNo) {
      throw new CustomError("Account number is required", 400);
    }

    const result = await paymentRequestService.payRequestedPayment(req.body);
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const payRequestedPaymentForRedirection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {

    if (!req.body.payId) {
      throw new CustomError("Payment request ID is required", 400);
    }

    if (!req.body.accountNo) {
      throw new CustomError("Account number is required", 400);
    }

    const result = await paymentRequestService.payRequestedPaymentForRedirection(req.body);
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const payUpaisaZindigi = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {

    if (!req.body.payId) {
      throw new CustomError("Payment request ID is required", 400);
    }

    if (!req.body.accountNo) {
      throw new CustomError("Account number is required", 400);
    }

    const result = await paymentRequestService.payUpaisaZindigi(req.body);
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const preRequest = async (req: Request, res: Response) => {
  const { accountNo, deviceId, location } = req.body || {};
  if (!accountNo || !location) return res.status(422).json({ error: "phone_and_location_required" });
  if (!validateLocation(location?.lat, location?.lng)) return res.status(422).json({ error: "invalid_location" });


  const phoneE164 = normalizeE164(accountNo);

  // Your existing 1-hour block check here (stub):
  // Place this in the route
  // if (await isTemporarilyBlocked(phoneE164)) return res.status(429).json({ error: "temporarily_blocked" });

  // Store location immediately (consent)
  const loc = await prisma.transactionLocation.create({
    data: {
      lat: location.lat, lng: location.lng,
      accuracyM: location.accuracyM ?? null,
      geohash: null, // optional: compute if you have a helper
      source: "device",
      consentAt: new Date(),
      tz: location.tz ?? "Asia/Karachi",
      ip: req.ip
    }
  });

  const firstSeen = await prisma.providerFirstSeen.findUnique({
    where: { provider_phoneE164: { provider: OTP_PROVIDER, phoneE164 } }
  });

  if (firstSeen) {
    return res.json({ firstTime: false, nextAction: "proceed" });
  }

  // Create OTP challenge
  const { challenge } = await createFirstTimeChallenge({
    phoneE164, provider: OTP_PROVIDER, ip: req.ip, deviceId, locationId: loc.id
  });
  return res.json({
    firstTime: true,
    nextAction: "verify_otp",
    challengeId: challenge.id,
    maskedPhone: maskPhone(phoneE164),
    feePreview: [2, 4, 6]
  });
};


export default {
  createPaymentRequest,
  getPaymentRequest,
  updatePaymentRequest,
  deletePaymentRequest,
  payRequestedPayment,
  getPaymentRequestbyId,
  createPaymentRequestClone,
  createPaymentRequestWithOtp,
  payUpaisaZindigi,
  preRequest,
  payRequestedPaymentForRedirection,
  createPaymentRequestWithOtpClone,
  createPaymentRequestForQR,
  getPaymentRequestbyTxnId
};
