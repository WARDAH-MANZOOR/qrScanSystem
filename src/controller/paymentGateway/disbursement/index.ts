import { Decimal } from "@prisma/client/runtime/library";
import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import { calculateDisbursement, getEligibleTransactions, getWalletBalance, updateTransactions } from "services/paymentGateway/disbursement/index.js";
import ApiResponse from "utils/ApiResponse.js";
import CustomError from "utils/custom_error.js";

const getWalletBalanceController = async (req: Request, res: Response, next: NextFunction) => {
    const merchantId = (req.user as JwtPayload)?.id;
    if (!merchantId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const balance = await getWalletBalance(merchantId);
        res.status(200).json(ApiResponse.success({ balance }));
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
}

const disburseTransactions = async (req: Request, res: Response, next: NextFunction) => {
    // Validate request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Return validation errors
        return res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string));
    }

    const merchantId = (req.user as JwtPayload)?.id;
    const { amount } = req.body;

    if (!merchantId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {

        // Get eligible transactions
        const transactions = await getEligibleTransactions(merchantId);
        if (transactions.length === 0) {
            throw new CustomError('No eligible transactions to disburse', 400);
        }

        let updates: TransactionUpdate[] = [];
        let totalDisbursed = new Decimal(0);

        if (amount) {
            const amountDecimal = new Decimal(amount);
            const result = calculateDisbursement(transactions, amountDecimal);
            updates = result.updates;
            totalDisbursed = result.totalDisbursed;
        } else {
            // Disburse all eligible transactions
            updates = transactions.map((t) => ({
                transaction_id: t.transaction_id,
                disbursed: true,
                balance: new Decimal(0),
            }));
            totalDisbursed = transactions.reduce(
                (sum, t) => sum.plus(t.balance),
                new Decimal(0)
            );
        }

        // Update transactions to set disbursed: true or adjust balances
        await updateTransactions(updates);

        res.status(200).json(ApiResponse.success({
            message: 'Transactions disbursed successfully',
            totalDisbursed: totalDisbursed.toString(),
            transactionsUpdated: updates.map((u) => u.transaction_id),
        }));
    } catch (error) {
        if (error instanceof CustomError) {
            res.status(error.statusCode).json(ApiResponse.error(error.message));
        } else {
            console.error('Error disbursing transactions:', error);
            res.status(500).json(ApiResponse.error("Internal Server Error"));
        }
    }
}

export {getWalletBalanceController, disburseTransactions};