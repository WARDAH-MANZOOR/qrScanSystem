import { paymentRequestService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
import CustomError from "../../utils/custom_error.js";
const createPaymentRequest = async (req, res, next) => {
    try {
        const result = await paymentRequestService.createPaymentRequest(req.body, req.user);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const createPaymentRequestClone = async (req, res, next) => {
    try {
        const result = await paymentRequestService.createPaymentRequestClone(req.body, req.params.merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const createPaymentRequestWithOtp = async (req, res, next) => {
    try {
        const result = await paymentRequestService.createPaymentRequestWithOtp(req.body, req.params.merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const getPaymentRequest = async (req, res, next) => {
    try {
        req.query.user = req.user;
        const result = await paymentRequestService.getPaymentRequest(req.query);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const updatePaymentRequest = async (req, res, next) => {
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
        const result = await paymentRequestService.updatePaymentRequest(id, req.body, user);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const getPaymentRequestbyId = async (req, res, next) => {
    try {
        const id = req.params?.id;
        if (!id) {
            throw new CustomError("Payment request ID is required", 400);
        }
        const result = await paymentRequestService.getPaymentRequestbyId(id);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const deletePaymentRequest = async (req, res, next) => {
    try {
        const paymentRequestId = req.params?.paymentRequestId;
        if (!paymentRequestId) {
            throw new CustomError("Payment request ID is required", 400);
        }
        const result = await paymentRequestService.deletePaymentRequest(paymentRequestId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const payRequestedPayment = async (req, res, next) => {
    try {
        if (!req.body.payId) {
            throw new CustomError("Payment request ID is required", 400);
        }
        if (!req.body.accountNo) {
            throw new CustomError("Account number is required", 400);
        }
        const result = await paymentRequestService.payRequestedPayment(req.body);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
        next(error);
    }
};
const payUpaisaZindigi = async (req, res, next) => {
    try {
        if (!req.body.payId) {
            throw new CustomError("Payment request ID is required", 400);
        }
        if (!req.body.accountNo) {
            throw new CustomError("Account number is required", 400);
        }
        const result = await paymentRequestService.payUpaisaZindigi(req.body);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (error) {
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
    createPaymentRequestClone,
    createPaymentRequestWithOtp,
    payUpaisaZindigi
};
