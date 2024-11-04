import { error } from "console";
import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import { easyPaisaService } from "services/index.js";
import type { DisbursementPayload } from "types/providers.js";
import ApiResponse from "utils/ApiResponse.js";

const initiateEasyPaisa = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let merchantId = req.params?.merchantId;

    if (!merchantId) {
      return res.status(400).json(ApiResponse.error("Merchant ID is required"));
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string));
    }

    const result = await easyPaisaService.initiateEasyPaisa(
      merchantId,
      req.body
    );
    return res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const getEasyPaisaMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const merchantId = req.params.merchantId;
    const merchant = await easyPaisaService.getMerchant(merchantId);
    return res.status(200).json(ApiResponse.success(merchant));
  } catch (error) {
    next(error);
  }
};

const createEasyPaisaMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string));
    }
    const newMerchant = await easyPaisaService.createMerchant(req.body);
    return res.status(201).json(ApiResponse.success(newMerchant));
  } catch (error) {
    next(error);
  }
};

const updateEasyPaisaMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string));
    }
    const merchantId = req.params.merchantId;
    const updatedMerchant = await easyPaisaService.updateMerchant(
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

const deleteEasyPaisaMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string));
    }
    const merchantId = req.params.merchantId;
    const deletedMerchant = await easyPaisaService.deleteMerchant(merchantId);
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

const statusInquiry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string));
    }
    const merchantId = req.params.merchantId;
    const payload = req.query;
    if (!merchantId) {
      return res.status(400).json(ApiResponse.error("Merchant ID is required"));
    }
    const result = await easyPaisaService.easypaisainquiry(payload, merchantId);
    return res.status(200).json(ApiResponse.success(result));
  } catch (err) {
    next(err);
  }
};

const createDisbursement = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const merchantId = req.params?.merchantId;
    const payload: DisbursementPayload = req.body;
    const result = await easyPaisaService.createDisbursement(payload, merchantId);
    return res.status(200).json(ApiResponse.success(result));
  } catch (err) {
    next(err);
  }
}

const getDisbursement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = (req.user as JwtPayload)?.merchant_id;
    const {query} = req;
    const merchant = await easyPaisaService.getDisbursement(id,query);
    return res.status(200).json(ApiResponse.success(merchant));
  } catch (error) {
    next(error);
  }
}

const disburseThroughBank = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.params?.merchantId;
    const payload: DisbursementPayload = req.body;
    const result = await easyPaisaService.disburseThroughBank(payload, merchantId);
    return res.status(200).json(ApiResponse.success(result));
  }
  catch(err) {
    next(err);
  }
}

export default {
  initiateEasyPaisa,
  getEasyPaisaMerchant,
  createEasyPaisaMerchant,
  updateEasyPaisaMerchant,
  deleteEasyPaisaMerchant,
  statusInquiry,
  createDisbursement,
  getDisbursement,
  disburseThroughBank
};
