import { body, param, query } from 'express-validator';
const initiateSwichValidation = [
    param('merchantId').isString().withMessage('Merchant ID is required'),
    body('channel').isInt().withMessage('Channel is required').isIn([5624, 1749]).withMessage("Invalid Channel"),
    body('amount').isString().withMessage('Amount should be a string'),
    body('phone').isString().withMessage('MSISDN is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('type').isString().withMessage('Type is required').isIn(["wallet"]).withMessage("Invalid Type"),
];
const createSwichMerchantValidation = [
    body('clientId').isString().withMessage('Client ID is required'),
    body('clientSecret').isString().withMessage('Client Secret is required'),
];
const updateSwichMerchantValidation = [
    param('merchantId').isString().withMessage('Merchant ID is required'),
    body('clientId').optional().isString().withMessage('Client ID should be a string'),
    body('clientSecret').optional().isString().withMessage('Client Secret should be a string'),
];
const deleteSwichMerchantValidation = [
    param('merchantId').isString().withMessage('Merchant ID is required'),
];
const swichTxInquiryValidation = [
    param('merchantId').isString().withMessage('Merchant ID is required'),
    query('transactionId').isString().withMessage('Transaction ID is required'),
];
export { initiateSwichValidation, createSwichMerchantValidation, updateSwichMerchantValidation, deleteSwichMerchantValidation, swichTxInquiryValidation, };
