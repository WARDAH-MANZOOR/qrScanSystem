import { NextFunction, Request, Response } from "express";
import {backofficeService} from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
import CustomError from "utils/custom_error.js";

const removeMerchantFinanceData = async (req: Request, res: Response) => {
    try {
        if (!req.params.merchantId) {
            throw new CustomError("Merchant Id must be given",404);
        }
        const result = await backofficeService.removeMerchantFinanceData(Number(req.params.merchantId));
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
        const result = await backofficeService.zeroMerchantWalletBalance(Number(req.params.merchantId));
        res.status(200).send(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(err.statusCode || 500).send(ApiResponse.error(err.message, err.statusCode || 500));
    }
};

const adjustMerchantWalletBalance = async (req: Request, res: Response) => {
    try {
        const { target } = req.body;
        console.log(req.params.merchantId)
        if (!req.params.merchantId || target == undefined) {
            throw new CustomError("Merchant Id and target balance must be given",404);
        }
        const result = await backofficeService.adjustMerchantWalletBalance(Number(req.params.merchantId), target, true);
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
        const stats = await backofficeService.checkMerchantTransactionStats(Number(req.params.merchantId));
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
        const result = await backofficeService.settleTransactions(transactionIds);
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
        const result = await backofficeService.settleAllMerchantTransactions(Number(req.params.merchantId));
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(err.statusCode || 500).send(ApiResponse.error(err.message, err.statusCode || 500));
    }
};

const createTransactionController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.merchantId) {
            throw new CustomError("Merchant Id must be given",404);
        }
        if (!req.body.original_amount || !req.body.provider_name || !req.body.provider_account || !(req.body.settlement == true || req.body.settlement == false)) {
            throw new CustomError("original_amount, provider_name, provider_account and settlement must be given",404);
        }
        const result = await backofficeService.createTransactionService(req.body, req.params.merchantId as string);
        res.status(201).json(ApiResponse.success(result));
    }
    catch(err) {
        next(err)
    }
}

const deleteMerchantDataController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.merchantId) {
            throw new CustomError("Merchant Id must be given",404);
        }
        const result = await backofficeService.deleteMerchantData(+req.params.merchantId);
        res.status(201).json(ApiResponse.success(result));
    }
    catch(err) {
        next(err)
    }
}

export default {
    adjustMerchantWalletBalance,
    checkMerchantTransactionStats,
    removeMerchantFinanceData,
    settleAllMerchantTransactions,
    settleTransactions,
    zeroMerchantWalletBalance,
    createTransactionController,
    deleteMerchantDataController
}