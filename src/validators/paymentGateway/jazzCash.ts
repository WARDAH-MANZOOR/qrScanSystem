import { body, param, query } from "express-validator";

const baseValidation = [
    body('password')
        .notEmpty()
        .withMessage('password is required')
        .isString()
        .withMessage('password must be a string'),
    body('integritySalt')
        .notEmpty()
        .withMessage('integritySalt is required')
        .isString()
        .withMessage('integritySalt must be a string'),
    body('returnUrl')
        .notEmpty()
        .withMessage('returnUrl is required')
        .isURL()
        .withMessage('returnUrl must be a valid URL'),
    body('jazzMerchantId')
        .notEmpty()
        .withMessage("jazzMerchantId is required")
        .isString()
        .withMessage("jazzMerchantId must be a string")
]
const validateJazzcashRequest = [
    param('merchantId')
        .notEmpty()
        .withMessage('Merchant ID is required')
        .isString()
        .withMessage('Merchant ID must be a string'),
    body('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isNumeric()
        .withMessage('Amount must be a number'),
    body('phone')
        .notEmpty()
        .withMessage('Phone is required')
        .isString()
        .withMessage('Phone must be a string'),
    body('redirect_url')
        .notEmpty()
        .withMessage('Redirect URL is required')
        .isURL()
        .withMessage('Redirect URL must be a valid URL'),
    body('type')
        .notEmpty()
        .withMessage('Payment type is required')
        .isIn(['wallet', 'card'])
        .withMessage('Payment type must be either WALLET or CARD'),
]

const validateGetJazzcashMerchant = [
    query('merchantId')
        .optional()
        .isInt()
        .withMessage('Merchant ID must be an integer'),
]

const validateCreateJazzcashMerchant = [
    body('merchantId')
        .notEmpty()
        .withMessage('Merchant ID is required')
        .isInt()
        .withMessage('Merchant ID must be an integer'),
    body('password')
        .notEmpty()
        .withMessage('password is required')
        .isString()
        .withMessage('password must be a string'),
    body('integritySalt')
        .notEmpty()
        .withMessage('integritySalt is required')
        .isString()
        .withMessage('integritySalt must be a string'),
    body('returnUrl')
        .notEmpty()
        .withMessage('returnUrl is required')
        .isURL()
        .withMessage('returnUrl must be a valid URL'),
    body('jazzMerchantId')
        .notEmpty()
        .withMessage("jazzMerchantId is required")
        .isString()
        .withMessage("jazzMerchantId must be a string")
]

const validateUpdateJazzcashMerchant = [
    param('merchantId')
        .notEmpty()
        .withMessage('Merchant ID is required')
        .isInt()
        .withMessage('Merchant ID must be an integer'),
    body('password')
        .optional()
        .isString()
        .withMessage('password must be a string'),
    body('integritySalt')
        .optional()
        .isString()
        .withMessage('integritySalt must be a string'),
    body('returnUrl')
        .optional()
        .isURL()
        .withMessage('returnUrl must be a valid URL'),
    body('jazzMerchantId')
        .optional()
        .isString()
        .withMessage("jazzMerchantId must be a string")
]

const validateDeleteJazzcashMerchant = [
    param('merchantId')
        .notEmpty()
        .withMessage('Merchant ID is required')
        .isInt()
        .withMessage('Merchant ID must be an integer'),
]

export { validateCreateJazzcashMerchant, validateDeleteJazzcashMerchant, validateGetJazzcashMerchant, validateJazzcashRequest, validateUpdateJazzcashMerchant }
