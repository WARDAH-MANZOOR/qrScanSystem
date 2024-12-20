import { Request, Response } from "express";
import backOfficeService from "services/backoffice/backoffice.js";
import ApiResponse from "utils/ApiResponse.js";
import CustomError from "utils/custom_error.js";

const removeMerchantFinanceData = async (req: Request, res: Response) => {
    try {
        if (!req.params.merchantId) {
            throw new CustomError("Merchant Id must be given",404);
        }
        const result = await backOfficeService.removeMerchantFinanceData(Number(req.params.merchantId));
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(err.statusCode || 500).send(ApiResponse.error(err.message, err.statusCode || 500));
    }
};

const zeroMerchantWalletBalance = async (req: Request, res: Response) => {
    try {
        if (!req.params.merchantId) {
            throw new CustomError("Merchant Id must be given",404);
        }
        const result = await backOfficeService.zeroMerchantWalletBalance(Number(req.params.merchantId));
        res.status(200).send(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(err.statusCode || 500).send(ApiResponse.error(err.message, err.statusCode || 500));
    }
};

const adjustMerchantWalletBalance = async (req: Request, res: Response) => {
    try {
        const { target } = req.body;
        if (!req.params.merchantId || !target) {
            throw new CustomError("Merchant Id and target balance must be given",404);
        }
        const result = await backOfficeService.adjustMerchantWalletBalance(Number(req.params.merchantId), target);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(err.statusCode || 500).send(ApiResponse.error(err.message, err.statusCode || 500));
    }
};

const checkMerchantTransactionStats = async (req: Request, res: Response) => {
    try {
        if (!req.params.merchantId) {
            throw new CustomError("Merchant Id must be given",404);
        }
        const stats = await backOfficeService.checkMerchantTransactionStats(Number(req.params.merchantId));
        res.status(200).json(stats);
    }
    catch (err: any) {
        res.status(err.statusCode || 500).send(ApiResponse.error(err.message, err.statusCode || 500));
    }
};

const settleTransactions = async (req: Request, res: Response) => {
    try {
        const { transactionIds } = req.body;
        if (transactionIds.length <= 0) {
            throw new CustomError("One id must be given")
        }
        const result = await backOfficeService.settleTransactions(transactionIds);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(err.statusCode || 500).send(ApiResponse.error(err.message, err.statusCode || 500));
    }
};

const settleAllMerchantTransactions = async (req: Request, res: Response) => {
    try {
        if (!req.params.merchantId) {
            throw new CustomError("Merchant Id must be given",404);
        }
        const result = await backOfficeService.settleAllMerchantTransactions(Number(req.params.merchantId));
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(err.statusCode || 500).send(ApiResponse.error(err.message, err.statusCode || 500));
    }
};

export default {
    adjustMerchantWalletBalance,
    checkMerchantTransactionStats,
    removeMerchantFinanceData,
    settleAllMerchantTransactions,
    settleTransactions,
    zeroMerchantWalletBalance
}