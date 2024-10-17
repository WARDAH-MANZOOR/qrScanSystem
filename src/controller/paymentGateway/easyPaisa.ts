import { Request, Response, NextFunction } from "express";
import { easyPaisaService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";

const initiateEasyPaisa = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {

    // let merchantId = req.params?.merchantId;
    // console.log("🚀 ~ merchantId:", merchantId)
    // if (!merchantId) {
    //   return res.status(400).json(ApiResponse.error("Merchant ID is required"));
    // }

    await easyPaisaService.initiateEasyPaisa(req.body);
    return res
      .status(200)
      .json(ApiResponse.success({ message: "Payment done successfully" }));
  } catch (error) {
    next(error);
  }
};

export default { initiateEasyPaisa };
