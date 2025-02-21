import { validationResult } from "express-validator";
import { jazzCashService } from "../../services/index.js";
import { checkTransactionStatus, getToken, initiateTransaction, initiateTransactionClone, mwTransaction, mwTransactionClone, simpleCheckTransactionStatus, simpleGetToken } from "../../services/paymentGateway/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
import CustomError from "../../utils/custom_error.js";
const initiateJazzCash = async (req, res, next) => {
    try {
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
        const result = await jazzCashService.initiateJazzCashPayment(paymentData, merchantId);
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
const initiateJazzCashAsync = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json(ApiResponse.error(errors.array()[0]));
            return;
        }
        const paymentData = req.body;
        let merchantId = req.params?.merchantId;
        if (!merchantId) {
            res.status(400).json(ApiResponse.error("Merchant ID is required"));
            return;
        }
        const result = await jazzCashService.initiateJazzCashPaymentAsync(paymentData, merchantId);
        if (result.statusCode != "pending") {
            res.status(result?.statusCode).send(ApiResponse.error(result));
            return;
        }
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const getJazzCashMerchant = async (req, res, next) => {
    try {
        const query = req.query;
        const result = await jazzCashService.getJazzCashMerchant(query);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const createJazzCashMerchant = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json(ApiResponse.error(errors.array()[0]));
        }
        const merchantData = req.body;
        const result = await jazzCashService.createJazzCashMerchant(merchantData);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const updateJazzCashMerchant = async (req, res, next) => {
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
        const result = await jazzCashService.updateJazzCashMerchant(merchantId, updateData);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const deleteJazzCashMerchant = async (req, res, next) => {
    try {
        const merchantId = parseInt(req.params.merchantId);
        if (!merchantId) {
            res.status(400).json(ApiResponse.error("Merchant ID is required"));
            return;
        }
        const result = await jazzCashService.deleteJazzCashMerchant(merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const statusInquiry = async (req, res, next) => {
    try {
        const merchantId = req.params.merchantId;
        const payload = req.body;
        if (!merchantId) {
            res.status(400).json(ApiResponse.error("Merchant ID is required"));
            return;
        }
        const result = await jazzCashService.statusInquiry(payload, merchantId);
        res.status(200).json(ApiResponse.success(result, "", result.statusCode == 500 ? 201 : 200));
    }
    catch (err) {
        next(err);
    }
};
const jazzStatusInquiry = async (req, res, next) => {
    try {
        const merchantId = req.params.merchantId;
        const payload = req.body;
        if (!merchantId) {
            res.status(400).json(ApiResponse.error("Merchant ID is required"));
            return;
        }
        const result = await jazzCashService.statusInquiry(payload, merchantId);
        res.status(200).json(ApiResponse.success(result, "", result.statusCode == 500 ? 201 : 200));
    }
    catch (err) {
        next(err);
    }
};
const initiateDisbursment = async (req, res, next) => {
    try {
        console.log("IBFT Called");
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        const token = await getToken(req.params.merchantId);
        const initTransaction = await initiateTransaction(token?.access_token, req.body, req.params.merchantId);
        res.status(200).json(ApiResponse.success(initTransaction));
    }
    catch (err) {
        next(err);
    }
};
const initiateMWDisbursement = async (req, res, next) => {
    try {
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        const token = await getToken(req.params.merchantId);
        const initTransaction = await mwTransaction(token?.access_token, req.body, req.params.merchantId);
        res.status(200).json(ApiResponse.success(initTransaction));
    }
    catch (err) {
        next(err);
    }
};
const initiateDisbursmentClone = async (req, res, next) => {
    try {
        console.log("IBFT Called");
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        if (req.body.amount <= 1) {
            throw new CustomError("Amount should be greater than 0", 400);
        }
        const token = await getToken(req.params.merchantId);
        const initTransaction = await initiateTransactionClone(token?.access_token, req.body, req.params.merchantId);
        res.status(200).json(ApiResponse.success(initTransaction));
    }
    catch (err) {
        next(err);
    }
};
const initiateMWDisbursementClone = async (req, res, next) => {
    try {
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        if (req.body.amount <= 1) {
            throw new CustomError("Amount should be greater than 0", 400);
        }
        const token = await getToken(req.params.merchantId);
        const initTransaction = await mwTransactionClone(token?.access_token, req.body, req.params.merchantId);
        res.status(200).json(ApiResponse.success(initTransaction));
    }
    catch (err) {
        next(err);
    }
};
const dummyCallback = async (req, res, next) => {
    try {
        const result = await jazzCashService.callback(req.body);
        res.status(200).send(result);
    }
    catch (err) {
        next(err);
    }
};
const disburseInquiryController = async (req, res, next) => {
    try {
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        const token = await getToken(req.params.merchantId);
        const inquiry = await checkTransactionStatus(token?.access_token, req.body, req.params.merchantId);
        res.status(200).json(ApiResponse.success(inquiry));
    }
    catch (err) {
        next(err);
    }
};
const simpleDisburseInquiryController = async (req, res, next) => {
    try {
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        const token = await simpleGetToken(req.params.merchantId);
        const inquiry = await simpleCheckTransactionStatus(token?.access_token, req.body, req.params.merchantId);
        res.status(200).json(ApiResponse.success(inquiry));
    }
    catch (err) {
        next(err);
    }
};
const initiateJazzCashCnic = async (req, res, next) => {
    try {
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
        const result = await jazzCashService.initiateJazzCashCnicPayment(paymentData, merchantId);
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
    initiateJazzCash,
    getJazzCashMerchant,
    createJazzCashMerchant,
    updateJazzCashMerchant,
    deleteJazzCashMerchant,
    statusInquiry,
    initiateDisbursment,
    initiateMWDisbursement,
    dummyCallback,
    disburseInquiryController,
    simpleDisburseInquiryController,
    initiateJazzCashAsync,
    jazzStatusInquiry,
    initiateJazzCashCnic,
    initiateDisbursmentClone,
    initiateMWDisbursementClone
};
