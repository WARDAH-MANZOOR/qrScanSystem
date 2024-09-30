import { getAllTransactionsOfMerchant } from "@prisma/client/sql";
import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";

const getTransactionOfMerchant = async (req: Request, res: Response) => {
    try {
        let { merchantId } = req.params;
        if (!merchantId || isNaN(parseInt(merchantId))) {
            let error = new CustomError("Merchant Not Found", 404);
            res.status(404).send(error);
        }
        let transactions = await prisma.$queryRawTyped(getAllTransactionsOfMerchant(parseInt(merchantId)));
        res.status(200).json(transactions);
    }
    catch (err) {
        let error = new CustomError("Internal Server Error", 500);
        res.status(500).send(error);
    }
}

const searchTransactions = async (req: Request, res: Response) => {
    const { transaction_id, merchant_name } = req.query;
    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                transaction_id: transaction_id ? transaction_id as string : undefined,
                merchant: {
                    username: merchant_name ? merchant_name as string : undefined,
                },
            },
        });
        res.status(200).json(transactions);
    } catch (error) {
        error = new CustomError("Internal Server Error", 500)
        res.status(500).json(error);
    }
}

export { getTransactionOfMerchant, searchTransactions };