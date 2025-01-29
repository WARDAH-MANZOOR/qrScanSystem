import { body, param } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import prisma from "prisma/client.js";
import { getWalletBalance } from "services/paymentGateway/disbursement.js";

const validateDisbursementRequest = [
    // Validate that the requestedAmount is a positive number
    body('requested_amount')
        .isFloat({ gt: 0 })
        .withMessage('Requested amount must be a positive number')

        // Custom validator to check against the database
        .custom(async (value, { req }) => {
            console.log(req.user)
            const merchantId = (req.user as JwtPayload)?.merchant_id;

            // Ensure merchantId is provided
            if (!merchantId) {
                throw new Error('Merchant ID is required');
            }

            // Fetch the total_to_disburse balance from the database
            const {walletBalance} = await getWalletBalance(merchantId) as {walletBalance: number};
 
            // Check if the requestedAmount exceeds the balanceToDisburse
            if (value > walletBalance) {
                throw new Error(
                    `Requested amount exceeds available balance. Available balance is ${walletBalance}`
                );
            }

            return true; // Validation passed
        }),
];

const updateDisbursementRequestStatus = [
    // Validate that the requestedAmount is a positive number
    param('requestId')
        .isInt({ gt: 0 })
        .withMessage('Request ID must be a positive integer')
        .custom(async (value, { req }) => {
            // Fetch the disbursement request from the database
            const disbursementRequest = await prisma.disbursementRequest.findUnique({
                where: { id: Number(value), status: 'pending' },
            });

            // Check if the disbursement request exists
            if (!disbursementRequest) {
                throw new Error('Disbursement request not found');
            }

            // Attach the disbursement request to the request object
            req.disbursementRequest = disbursementRequest;

            return true; // Validation passed
        }),
    body('status')
        .isIn(['approved', 'rejected'])
        .withMessage('Status must be either "approved" or "rejected"'),
];

export default {
    validateDisbursementRequest,
    updateDisbursementRequestStatus
}