import { NextFunction, Request, Response } from "express";
import jazzcashDisburse from "services/paymentGateway/jazzcashDisburse.js";
import ApiResponse from "utils/ApiResponse.js";

const addDisburseAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const result = await jazzcashDisburse.addDisburseAccount(req.body);
        return res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
};

const getDisburseAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const result = await jazzcashDisburse.getDisburseAccount(
            req.params.accountId
        );
        return res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
};

const updateDisburseAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const result = await jazzcashDisburse.updateDisburseAccount(
            req.params.accountId,
            req.body
        );
        return res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
};

const deleteDisburseAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const result = await jazzcashDisburse.deleteDisburseAccount(
            req.params.accountId
        );
        return res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
};

export default {
    addDisburseAccount,
    getDisburseAccount,
    updateDisburseAccount,
    deleteDisburseAccount,
};