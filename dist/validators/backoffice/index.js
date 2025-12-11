import { body, param, query, validationResult } from "express-validator";
import { ProviderEnum, LimitPeriod } from "@prisma/client";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
const validateSettlement = [
    body('merchant_id')
        .isInt()
        .withMessage('Merchant ID must be an integer')
        .custom(async (value) => {
        const merchant = await prisma.merchant.findUnique({
            where: {
                merchant_id: value
            }
        });
        if (!merchant) {
            throw new CustomError("Invalid Merchant Id", 500);
        }
    }),
    body('date').isString().withMessage('Date must be a valid date'),
    body('pkr_amount').isFloat({ min: 0 }).withMessage('PKR Amount must be a positive float'),
    body('usdt_amount').isFloat({ min: 0 }).withMessage('USDT Amount must be a positive float'),
    body('usdt_pkr_rate').isFloat({ min: 0 }).withMessage('USDT PKR Rate must be a positive float'),
    body('conversion_charges').isString().isLength({ min: 0 }).withMessage('Conversion Charges must be a string'),
    body('total_usdt').isFloat({ min: 0 }).withMessage('Total USDT must be a positive float'),
    body('wallet_address').isString().isLength({ min: 1 }).withMessage('Wallet Address must be a non-empty string'),
];
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
const limitRequired = [
    body("merchant_id").isInt().withMessage("merchant_id is required"),
    body("provider").isString().isIn(Object.keys(ProviderEnum)).withMessage("provider must be ProviderEnum"),
    body("period").isString().isIn(Object.keys(LimitPeriod)).withMessage("period must be LimitPeriod"),
];
const limitOptional = [
    body("timezone").optional().isString(),
    body("weekStartDow").optional().isInt({ min: 1, max: 7 }),
    body("maxAmount").optional().isFloat({ min: 0 }),
    body("maxTxn").optional().isInt({ min: 0 }),
    body("active").optional().isBoolean(),
];
const validateLimitCreate = [...limitRequired, ...limitOptional];
const validateLimitUpdate = [
    param("id").isInt().withMessage("id is required"),
    ...limitOptional,
];
const validateLimitList = [
    query("merchant_id").optional().isInt(),
    query("provider").optional().isString().isIn(Object.keys(ProviderEnum)),
    query("active").optional().isBoolean(),
];
export default {
    validateSettlement,
    handleValidationErrors,
    validateLimitCreate,
    validateLimitUpdate,
    validateLimitList
};
