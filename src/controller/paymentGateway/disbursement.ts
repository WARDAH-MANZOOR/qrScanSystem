import { Decimal } from "@prisma/client/runtime/library";
import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import prisma from "prisma/client.js";
import { calculateDisbursement, getEligibleTransactions, getMerchantRate, getWalletBalance, updateTransactions } from "services/paymentGateway/disbursement.js";
import ApiResponse from "utils/ApiResponse.js";
import CustomError from "utils/custom_error.js";

const getWalletBalanceController = async (req: Request, res: Response, next: NextFunction) => {
    const merchantId = (req.user as JwtPayload)?.id;
    if (!merchantId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const balance: any = await getWalletBalance(merchantId);
        res.status(200).json(ApiResponse.success({ ...balance }));
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
    let { amount } = req.body;
    let rate = await getMerchantRate(prisma,merchantId);
    amount *= (1 - +rate);
    if (!merchantId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {

        // Get eligible transactions
        const transactions = await getEligibleTransactions(merchantId,prisma);
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
            updates = transactions.map((t:any) => ({
                transaction_id: t.transaction_id,
                disbursed: true,
                balance: new Decimal(0),
                settled_amount: t.settled_amount,
                original_amount: t.original_amount
            }));
            totalDisbursed = transactions.reduce(
                (sum: Decimal, t:any) => sum.plus(t.balance),
                new Decimal(0)
            );
        }

        // Update transactions to set disbursed: true or adjust balances
        await updateTransactions(updates,prisma);

        res.status(200).json(ApiResponse.success({
            message: 'Transactions disbursed successfully',
            totalDisbursed: totalDisbursed.toString(),
            transactionsUpdated: updates,
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