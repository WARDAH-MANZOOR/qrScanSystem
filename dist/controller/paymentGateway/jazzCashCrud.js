import { jazzCashCardCrud } from "../../services/index.js";
import ApiResponse from "utils/ApiResponse.js";
import { validationResult } from "express-validator";
const getJazzCashCardMerchant = async (req, res, next) => {
    try {
        // const errors = validationResult(req);
        // if (!errors.isEmpty()) {
        //    res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
        // }
        const query = req.query;
        const result = await jazzCashCardCrud.getJazzCashCardMerchant(query);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const createJazzCashCardMerchant = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json(ApiResponse.error(errors.array()[0]));
        }
        const merchantData = req.body;
        const result = await jazzCashCardCrud.createJazzCashCardMerchant(merchantData);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const updateJazzCashCardMerchant = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json(ApiResponse.error(errors.array()[0]));
            return;
        }
        const merchantId = parseInt(req.params.merchantId);
        const updateData = req.body;
        if (!merchantId) {
            res.status(400).json(ApiResponse.error("Merchant ID is required"));
            return;
        }
        const result = await jazzCashCardCrud.updateJazzCashCardMerchant(merchantId, updateData);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const deleteJazzCashCardMerchant = async (req, res, next) => {
    try {
        const merchantId = parseInt(req.params.merchantId);
        if (!merchantId) {
            res.status(400).json(ApiResponse.error("Merchant ID is required"));
            return;
        }
        const result = await jazzCashCardCrud.deleteJazzCashCardMerchant(merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
export default {
    getJazzCashCardMerchant,
    createJazzCashCardMerchant,
    updateJazzCashCardMerchant,
    deleteJazzCashCardMerchant
};
