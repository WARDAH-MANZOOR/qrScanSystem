import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { wooCommerceService } from "services/index.js";
import ApiResponse from "utils/ApiResponse.js";

const getWoocommerceMerchant = async (
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
        const result = await wooCommerceService.getWoocommerceMerchant(query);
        res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
}

const createWoocommerceMerchant = async (
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
        const result = await wooCommerceService.createWoocommerceMerchant(merchantData);
        res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
}

const updateWoocommerceMerchant = async (
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

        const result = await wooCommerceService.updateWoocommerceMerchant(merchantId, updateData);
        res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
};

const deleteWoocommerceMerchant = async (
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

        const result = await wooCommerceService.deleteWoocommerceMerchant(merchantId);
        res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        next(error);
    }
};

export default {
    createWoocommerceMerchant,
    getWoocommerceMerchant,
    updateWoocommerceMerchant,
    deleteWoocommerceMerchant
}