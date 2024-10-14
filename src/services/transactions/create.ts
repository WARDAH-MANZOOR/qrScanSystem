import { Decimal } from "@prisma/client/runtime/library";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";
import jwt from "jsonwebtoken";

async function getMerchantCommission(merchantId: number): Promise<number | Decimal> {
    console.log(merchantId);
    const merchant = await prisma.merchantFinancialTerms.findUnique({
        where: { merchant_id: merchantId },
    });
    if (!merchant) {
        throw new CustomError('Merchant not found', 404);
    }

    return +merchant.commissionRate + +merchant.commissionGST + +merchant.commissionWithHoldingTax;
}

async function findOrCreateCustomer(customerName: string, customerEmail: string, merchantId: number) {
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
    else if(customer.groups.find((user) => user.groupId != 2)) {
        throw new CustomError("Given user is not a customer",400);
    }
    return customer;
}

function calculateSettledAmount(originalAmount: number, commissionPercentage: number | Decimal): number {
    return originalAmount * (1 - +commissionPercentage);
}

async function createTransactionRecord({
    id,
    originalAmount,
    type,
    merchantId,
    settledAmount,
    customerId,
}: {
    id: string;
    originalAmount: number;
    type: string;
    merchantId: number;
    settledAmount: number;
    customerId: number;
}) {
    if (type != "wallet" && type != "card" && type != "bank") {
        return;
    }
    const transaction = await prisma.transaction.create({
        data: {
            transaction_id: id,
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
        const commissionPercentage = await getMerchantCommission(obj.merchant_id);
        const customer = await findOrCreateCustomer(obj.customerName, obj.customerEmail,obj.merchant_id);
        const customerId = customer?.id;
        const originalAmount = parseFloat(obj.original_amount);
        const settledAmount = calculateSettledAmount(originalAmount, commissionPercentage);
        // Create a new transaction request in the database
        const transaction = await createTransactionRecord({
            id: obj.id,
            originalAmount: originalAmount,
            type: obj.type,
            merchantId: obj.merchant_id,
            settledAmount: settledAmount,
            customerId: customerId as number
        });

        const transactionLink = await generateTransactionLink(transaction?.transaction_id as string);
        return {
            transaction,
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

export {createTransaction};