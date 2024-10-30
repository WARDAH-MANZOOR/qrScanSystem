import { Decimal } from "@prisma/client/runtime/library";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client/extension";
import { transactionService } from "services/index.js";

async function getMerchantCommission(merchantId: number, prisma: PrismaClient): Promise<number> {
    console.log(merchantId);
    const merchant = await prisma.merchantFinancialTerms.findUnique({
        where: { merchant_id: merchantId },
    });
    if (!merchant) {
        throw new CustomError('Merchant not found', 404);
    }

    return +Number(merchant.commissionRate) + +Number(merchant.commissionGST) + +Number(merchant.commissionWithHoldingTax);
}

async function findOrCreateCustomer(customerName: string, customerEmail: string, merchantId: number, prisma: PrismaClient) {
    let customer = await prisma.user.findUnique({
        where: { email: customerEmail },
        include: {
            groups: {
                include: {
                    group: {
                        select: {
                            id: true
                        }
                    }
                }
            }
        }
    });
    if (!customer) {
        let new_customer = await prisma.user.create({
            data: {
                username: customerName,
                email: customerEmail,
                password: '', // Handle password appropriately
            },
        });
        await prisma.userGroup.create({
            data: {
                userId: new_customer.id,
                groupId: 3,
                merchantId
            }
        })
        return new_customer;
    }
    else if (customer.groups.find((user: any) => user.groupId != 2)) {
        throw new CustomError("Given user is not a customer", 400);
    }
    return customer;
}

function calculateSettledAmount(originalAmount: number, commissionPercentage: number | Decimal): number {
    return originalAmount * (1 - +commissionPercentage);
}

async function createTransactionRecord({
    order_id,
    id,
    originalAmount,
    type,
    merchantId,
    settledAmount,
    customerId,
}: {
    order_id: string;
    id: string;
    originalAmount: number;
    type: string;
    merchantId: number;
    settledAmount: number;
    customerId: number;
},
    prisma: PrismaClient) {
    if (type != "wallet" && type != "card" && type != "bank") {
        return;
    }
    let data: {transaction_id?: string} = {};
    if(order_id) {
        data["transaction_id"] = order_id;
    }
    else {
        data["transaction_id"] = transactionService.createTransactionId();
    }
    const transaction = await prisma.transaction.create({
        data: {
            ...data,
            date_time: new Date(),
            original_amount: originalAmount,
            status: 'pending', // Ensure this matches your enum
            type,
            settled_amount: settledAmount,
            balance: settledAmount,
            merchant: {
                connect: { id: merchantId },
            },
            customer: {
                connect: { id: customerId },
            },
        },
    });

    return transaction;
}

function createTransactionToken(transactionId: string) {
    const secret = process.env.JWTSECRET || 'your_default_secret';
    const token = jwt.sign({ transactionId }, secret, { expiresIn: '1h' });
    return token;
}

async function generateTransactionLink(transactionId: string) {
    const baseUrl = 'http://localhost:3005/payment';

    const token = createTransactionToken(transactionId);

    const transactionLink = `${baseUrl}?t=${encodeURIComponent(token)}&signupUrlResourceParams=${encodeURIComponent(
        transactionId
    )}`;

    return transactionLink;
}

const createTransaction = async (obj: any) => {
    try {
        const result = await prisma.$transaction(async (prismaTransaction) => {
            const commissionPercentage = await getMerchantCommission(obj.merchant_id, prismaTransaction);
            const customer = await findOrCreateCustomer(obj.customerName, obj.customerEmail, obj.merchant_id, prismaTransaction);
            const customerId = customer?.id;
            const originalAmount = parseFloat(obj.original_amount);
            const settledAmount = calculateSettledAmount(originalAmount, commissionPercentage);
            // Create a new transaction request in the database
            const transaction = await createTransactionRecord({
                order_id: obj.order_id,
                id: obj.id,
                originalAmount: originalAmount,
                type: obj.type,
                merchantId: obj.merchant_id,
                settledAmount: settledAmount,
                customerId: customerId as number
            },
                prismaTransaction);
            return { transaction };
        });
        const transactionLink = await generateTransactionLink(result?.transaction.transaction_id as string);
        return {
            result,
            transactionLink
        }

    }
    catch (err) {
        console.error('Error creating transaction request:', err);

        if (err instanceof CustomError) {
            throw new Error(err.message);
        }

        throw new Error("Internal Server Error");
    }
}

export { createTransaction };