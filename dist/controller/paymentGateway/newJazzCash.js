import { validationResult } from "express-validator";
import { newJazzCashService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
const newInitiateJazzCash = async (req, res, next) => {
    try {
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        const paymentData = req.body;
        console.log("Payment Data: ", paymentData);
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json(ApiResponse.error(errors.array()[0]));
            return;
        }
        let merchantId = req.params?.merchantId;
        if (!merchantId) {
            res.status(400).json(ApiResponse.error("Merchant ID is required"));
            return;
        }
        const result = await newJazzCashService.newInitiateJazzCashPayment(paymentData, merchantId);
        if (result.statusCode != "000") {
            res.status(result.statusCode != 500 ? result.statusCode : 201).send(ApiResponse.error(result, result.statusCode != 500 ? result.statusCode : 201));
            return;
        }
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const newStatusInquiry = async (req, res, next) => {
    try {
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        const merchantId = req.params.merchantId;
        const payload = req.body;
        if (!merchantId) {
            res.status(400).json(ApiResponse.error("Merchant ID is required"));
            return;
        }
        const result = await newJazzCashService.newStatusInquiry(payload, merchantId);
        res.status(200).json(ApiResponse.success(result, "", result.statusCode == 500 ? 201 : 200));
    }
    catch (err) {
        next(err);
    }
};
const newInitiateJazzCashCnic = async (req, res, next) => {
    try {
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        const paymentData = req.body;
        console.log("Payment Data: ", paymentData);
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json(ApiResponse.error(errors.array()[0]));
            return;
        }
        let merchantId = req.params?.merchantId;
        if (!merchantId) {
            res.status(400).json(ApiResponse.error("Merchant ID is required"));
            return;
        }
        const result = await newJazzCashService.newInitiateJazzCashCnicPayment(paymentData, merchantId);
        if (result.statusCode != "000") {
            res.status(result.statusCode != 500 ? +result.statusCode : 201).send(ApiResponse.error(result, result.statusCode != 500 ? +result.statusCode : 201));
            return;
        }
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
export default {
    newInitiateJazzCash,
    newInitiateJazzCashCnic,
    newStatusInquiry
};
