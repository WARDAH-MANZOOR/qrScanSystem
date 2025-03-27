import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { payfast, transactionService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";
import CustomError from "utils/custom_error.js";

const pay = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = await payfast.getApiToken(req.params.merchantId, req.body);
        if (!token?.token) {
            throw new CustomError("No Token Recieved", 500);
        }
        const validation = await payfast.validateCustomerInformation(req.params.merchantId, {
            token: token?.token,
            bankCode: '13',
            ...req.body
        })
        if (!validation?.transaction_id) {
            throw new CustomError("No Transaction ID Recieved", 500);
        }
        const payment = await payfast.pay(req.params.merchantId, {
            token: token?.token,
            bankCode: '13',
            transaction_id: validation?.transaction_id,
            ...req.body
        })
        res.status(200).json(ApiResponse.success(payment));
    }
    catch (err) {
        next(err);
    }
}

const upaisaValidation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = await payfast.getApiToken(req.params.merchantId, req.body);
        if (!token?.token) {
            throw new CustomError("No Token Recieved", 500);
        }
        const validation = await payfast.validateCustomerInformationForCnic(req.params.merchantId, {
            token: token?.token,
            bankCode: '14',
            ...req.body
        })
        if (!validation?.transaction_id) {
            // throw new CustomError(validation?.response_message, 500);
            res.status(500).json(validation)
            return
        }
        // const payment = await payfast.payCnic(req.params.merchantId, {
        //     token: token?.token,
        //     bankCode: '14',
        //     transaction_id: validation?.transaction_id,
        //     ...req.body
        // })
        res.status(200).json(ApiResponse.success(validation));
    }
    catch (err) {
        next(err);
    }
}

const zindigiValidation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = await payfast.getApiToken(req.params.merchantId, req.body);
        if (!token?.token) {
            throw new CustomError("No Token Recieved", 500);
        }
        const validation = await payfast.validateCustomerInformationForCnic(req.params.merchantId, {
            token: token?.token,
            bankCode: '29',
            ...req.body
        })
        if (!validation?.transaction_id) {
            res.status(500).json(validation)
            return
        }
        // const payment = await payfast.payCnic(req.params.merchantId, {
        //     token: token?.token,
        //     bankCode: '14',
        //     transaction_id: validation?.transaction_id,
        //     ...req.body
        // })
        res.status(200).json(ApiResponse.success(validation));
    }
    catch (err) {
        next(err);
    }
}

const upaisaPay = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = await payfast.getApiToken(req.params.merchantId, req.body);
        if (!token?.token) {
            throw new CustomError("No Token Recieved", 500);
        }
        const payment = await payfast.payCnic(req.params.merchantId, {
            token: token?.token,
            bankCode: '14',
            ...req.body
        })
        res.status(200).json(ApiResponse.success(payment));
    }
    catch (err) {
        next(err);
    }
}

const zindigiPay = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = await payfast.getApiToken(req.params.merchantId, req.body);
        if (!token?.token) {
            throw new CustomError("No Token Recieved", 500);
        }
        const payment = await payfast.payCnic(req.params.merchantId, {
            token: token?.token,
            bankCode: '29',
            ...req.body
        })
        res.status(200).json(ApiResponse.success(payment));
    }
    catch (err) {
        next(err);
    }
}

const zindigi = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = await payfast.getApiToken(req.params.merchantId, req.body);
        if (!token?.token) {
            throw new CustomError("No Token Recieved", 500);
        }
        const validation = await payfast.validateCustomerInformation(req.params.merchantId, {
            token: token?.token,
            bankCode: '29',
            ...req.body
        })
        if (!validation?.transaction_id) {
            throw new CustomError("No Transaction ID Recieved", 500);
        }
        const payment = await payfast.payCnic(req.params.merchantId, {
            token: token?.token,
            bankCode: '29',
            transaction_id: validation?.transaction_id,
            ...req.body
        })
        res.status(200).json(ApiResponse.success(payment));
    }
    catch (err) {
        next(err);
    }
}

const getPayFastMerchant = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // const errors = validationResult(req);
        // if (!errors.isEmpty()) {
        //    res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
        // }
        const query: any = req.query;
        const result = await payfast.getPayFastMerchant(query);
        res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
}

const createPayFastMerchant = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
        }
        const merchantData = req.body;
        const result = await payfast.createPayFastMerchant(merchantData);
        res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
}

const updatePayFastMerchant = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
            return
        }

        const merchantId = parseInt(req.params.merchantId);
        const updateData = req.body;

        if (!merchantId) {
            res.status(400).json(ApiResponse.error("Merchant ID is required"));
            return

        }

        const result = await payfast.updatePayFastMerchant(merchantId, updateData);
        res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
};

const deletePayFastMerchant = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const merchantId = parseInt(req.params.merchantId);

        if (!merchantId) {
            res.status(400).json(ApiResponse.error("Merchant ID is required"));
            return

        }

        const result = await payfast.deletePayFastMerchant(merchantId);
        res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
};

const statusInquiry = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const merchantId = req.params.merchantId;
        const transactionId = req.query.transactionId;
        const method = (await payfast.getPayfastInquiryMethod(merchantId))?.payfastInquiryMethod;
        let result;
        if (method == "DATABASE") {
            result = await payfast.databaseStatusInquiry(merchantId, transactionId as string)
        }
        else {
            const token = await payfast.getApiToken(req.params.merchantId, req.body);
            if (!token?.token) {
                throw new CustomError("No Token Recieved", 500);
            }
            result = await payfast.payfastStatusInquiry(merchantId, transactionId as string, token?.token)
        }
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err) {
        next(err);
    }
}

export default { pay, upaisaValidation, zindigi, getPayFastMerchant, createPayFastMerchant, updatePayFastMerchant, deletePayFastMerchant, upaisaPay, zindigiValidation, zindigiPay, statusInquiry }