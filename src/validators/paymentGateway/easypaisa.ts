import { body, param } from "express-validator";

const validateEasypaisaTxn = [
    param('merchantId').isString().withMessage('Merchant ID must be a string'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('phone').isString().withMessage('Phone must be a string'),
    body('email').isEmail().withMessage('Must be a valid email')
]

const validateCreateMerchant = [
    body("storeId").notEmpty().withMessage("Store ID is required"),
    body("username").notEmpty().withMessage("Username is required"),
    body("credentials").notEmpty().withMessage("Credentials are required"),
]

const validateUpdateMerchant = [
    param("merchantId").notEmpty().withMessage("Merchant ID is required"),
]

const validateInquiry = [
    ...validateUpdateMerchant,
    body("orderId").isString().withMessage("Order ID must be a string")
]

export {validateEasypaisaTxn, validateCreateMerchant, validateUpdateMerchant, validateInquiry}