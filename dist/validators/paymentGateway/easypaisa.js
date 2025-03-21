import { body, param, query } from "express-validator";
const validateEasypaisaTxn = [
    param('merchantId').isString().withMessage('Merchant ID must be a string'),
    body('amount').isString().withMessage('Amount must be a string'),
    body('phone').isString().withMessage('Phone must be a string'),
    body('email').isEmail().withMessage('Must be a valid email'),
    body('type').equals("wallet").withMessage("Must be wallet type")
];
const validateCreateMerchant = [
    body("storeId").notEmpty().withMessage("Store ID is required"),
    body("username").notEmpty().withMessage("Username is required"),
    body("credentials").notEmpty().withMessage("Credentials are required"),
    body('merchant_of').optional().isString().withMessage("Merchant name must be a string")
];
const validateUpdateMerchant = [
    param("merchantId").notEmpty().withMessage("Merchant ID is required"),
    body('merchant_of').optional().isString().withMessage("Merchant name must be a string")
];
const validateInquiry = [
    ...validateUpdateMerchant,
    query("orderId").isString().withMessage("Order ID must be a string")
];
export { validateEasypaisaTxn, validateCreateMerchant, validateUpdateMerchant, validateInquiry };
