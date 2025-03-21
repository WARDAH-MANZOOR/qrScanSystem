import { validationResult } from "express-validator";
import { payfast } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
import CustomError from "utils/custom_error.js";
const pay = async (req, res, next) => {
    try {
        const token = await payfast.getApiToken(req.params.merchantId, req.body);
        if (!token?.token) {
            throw new CustomError("No Token Recieved", 500);
        }
        const validation = await payfast.validateCustomerInformation(req.params.merchantId, {
            token: token?.token,
            bankCode: '13',
            ...req.body
        });
        if (!validation?.transaction_id) {
            throw new CustomError("No Transaction ID Recieved", 500);
        }
        const payment = await payfast.pay(req.params.merchantId, {
            token: token?.token,
            bankCode: '13',
            transaction_id: validation?.transaction_id,
            ...req.body
        });
        res.status(200).json(ApiResponse.success(payment));
    }
    catch (err) {
        next(err);
    }
};
const getPayFastMerchant = async (req, res, next) => {
    try {
        // const errors = validationResult(req);
        // if (!errors.isEmpty()) {
        //    res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
        // }
        const query = req.query;
        const result = await payfast.getPayFastMerchant(query);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const createPayFastMerchant = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json(ApiResponse.error(errors.array()[0]));
        }
        const merchantData = req.body;
        const result = await payfast.createPayFastMerchant(merchantData);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const updatePayFastMerchant = async (req, res, next) => {
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
        const result = await payfast.updatePayFastMerchant(merchantId, updateData);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const deletePayFastMerchant = async (req, res, next) => {
    try {
        const merchantId = parseInt(req.params.merchantId);
        if (!merchantId) {
            res.status(400).json(ApiResponse.error("Merchant ID is required"));
            return;
        }
        const result = await payfast.deletePayFastMerchant(merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
export default { pay, getPayFastMerchant, createPayFastMerchant, updatePayFastMerchant, deletePayFastMerchant };
