import { body, param } from "express-validator";

const updateMerchantValidation = [
    body('username').isString().withMessage('Username is required'),
    body('phone_number').isString().withMessage('Phone number is required'),
    body('company_name').isString().withMessage('Company name is required'),
    body('city').isString().withMessage('City is required'),
    body('commission').isNumeric().withMessage('Commission should be a number'),
    body('settlementDuration').optional().isNumeric().withMessage('Settlement duration should be a number'),
    param('merchantId').optional().isString().withMessage('Merchant ID is required'),
];

const addMerchantValidation = [
    body('username').isString().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isString().withMessage('Password is required'),
    body('phone_number').isString().withMessage('Phone number is required'),
    body('company_name').isString().withMessage('Company name is required'),
    body('city').isString().withMessage('City is required'),
    body('payment_volume').isNumeric().withMessage('Payment volume should be a number'),
    body('commission').isNumeric().withMessage('Commission should be a number'),
    body('settlementDuration').isNumeric().withMessage('Settlement duration is required'),
];

export {
    updateMerchantValidation,
    addMerchantValidation
}