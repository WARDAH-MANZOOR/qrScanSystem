import { NextFunction, Request, Response } from "express";
import { cardService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";

const getJazzCashCardMerchant = async (req: Request, res: Response, next: NextFunction) => {
    const {merchantId} = req.params;
    const cardMerchant = await cardService.getJazzCashCardMerchant(merchantId);
    return res.status(200).json(ApiResponse.success(cardMerchant))
}