import { Request, Response, NextFunction } from "express";
import { easyPaisaService } from "services/index.js";
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

const statusInquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.params.merchantId;
    const payload = req.body;
    if(!merchantId) {
      return res.status(400).json(ApiResponse.error("Merchant ID is required"));
    }
    const result = await easyPaisaService.easypaisainquiry(payload,merchantId);
    return res.status(200).json(ApiResponse.success(result));
  }
  catch(err) {
    next(err);
  }
};

export default {
  initiateEasyPaisa,
  getEasyPaisaMerchant,
  createEasyPaisaMerchant,
  updateEasyPaisaMerchant,
  deleteEasyPaisaMerchant,
  statusInquiry,
};
