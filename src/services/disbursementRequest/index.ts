import { parse, parseISO } from "date-fns";
import { Parser } from "json2csv";
import prisma from "prisma/client.js";
import { backofficeService } from "services/index.js";
import { getWalletBalance } from "services/paymentGateway/disbursement.js";
import CustomError from "utils/custom_error.js";

const createDisbursementRequest = async (requested_amount: number, merchant_id: number) => {
    try {
        await prisma.$transaction(async (tx) => {
            await tx.disbursementRequest.create({
                data: {
                    requestedAmount: requested_amount,
                    merchantId: Number(merchant_id),
                    status: "approved"
                }
            });
            const { walletBalance } = await getWalletBalance(Number(merchant_id)) as { walletBalance: number };
            const updatedAvailableBalance = walletBalance - Number(requested_amount);
            await backofficeService.adjustMerchantWalletBalanceithTx(Number(merchant_id), updatedAvailableBalance, false, tx);
            await tx.merchant.update({
                where: { merchant_id: Number(merchant_id) },
                data: { balanceToDisburse: { increment: Number(requested_amount) } }
            });
        },
        {
            timeout: 10000,
            maxWait: 10000
        })
    }
    catch (err: any) {
        throw new CustomError(err.message, 500);
    }
}

const updateDisbursementRequestStatus = async (requestId: number, status: string) => {
    try {
        const disbursementRequest = await prisma.disbursementRequest.update({
            where: { id: requestId },
            data: { status: status }
        });
        if (status == "approved") {
            await prisma.merchant.update({
                where: { merchant_id: disbursementRequest.merchantId },
                data: { balanceToDisburse: { increment: Number(disbursementRequest.requestedAmount) } }
            });
        }
        else if (status == "rejected") {
            const { walletBalance } = await getWalletBalance(disbursementRequest.merchantId) as { walletBalance: number };
            const updatedAvailableBalance = walletBalance + Number(disbursementRequest.requestedAmount);
            await backofficeService.adjustMerchantWalletBalance(disbursementRequest.merchantId, updatedAvailableBalance, false);
        }
        return {
            id: disbursementRequest.id,
            status: disbursementRequest.status
        }
    }
    catch (err: any) {
        throw new CustomError(err.message, 500);
    }
}

const getDisbursementRequests = async (params: any, merchantId: any) => {
    try {
        let startDate = params.start as string;
        let endDate = params.end as string;
        const status = params.status as string;

        const customWhere = {} as any;

        if (startDate && endDate) {
            startDate = startDate.replace(" ", "+");
            endDate = endDate.replace(" ", "+");

            const todayStart = parse(
                startDate,
                "yyyy-MM-dd'T'HH:mm:ssXXX",
                new Date()
            );
            const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

            customWhere["createdAt"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }

        if (status) {
            customWhere["status"] = status;
        }

        let { page, limit } = params;
        // Query based on provided parameters
        let skip, take;
        if (page && limit) {
            skip = (+page > 0 ? parseInt(page as string) - 1 : parseInt(page as string)) * parseInt(limit as string);
            take = parseInt(limit as string);
        }
        const transactions = await prisma.disbursementRequest.findMany({
            ...(skip && { skip: +skip }),
            ...(take && { take: +take }),
            where: {
                ...(merchantId && { merchantId: parseInt(merchantId as string) }),
                ...customWhere,
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                merchant: true
            }
        });

        let meta = {};
        if (page && take) {
            // Get the total count of transactions
            const total = await prisma.disbursementRequest.count(
                {
                    where: {
                        ...(merchantId && { merchantId: parseInt(merchantId as string) }),
                        ...customWhere,
                    },
                }
            );
            // Calculate the total number of pages
            const pages = Math.ceil(total / +take);
            meta = {
                total,
                pages,
                page: parseInt(page as string),
                limit: take
            }
        }
        const response = {
            transactions: transactions.map((transaction) => ({
                ...transaction,
                merchant_name: transaction.merchant.full_name
            })),
            meta,
        };

        return response;
    } catch (err) {
        console.log(err)
        const error = new CustomError("Internal Server Error", 500);
        return error;
    }
};

const exportDisbursementRequest = async (merchantId: number, params: any) => {
    try {
        const startDate = params?.start?.replace(" ", "+");
        const endDate = params?.end?.replace(" ", "+");

        const customWhere = {
        } as any;

        if (merchantId) {
            customWhere["merchantId"] = +merchantId;
        }


        if (startDate && endDate) {
            const todayStart = parseISO(startDate as string);
            const todayEnd = parseISO(endDate as string);

            customWhere["createdAt"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }

        if (params.status) {
            customWhere["status"] = params.status;
        }

        const disbursements = await prisma.disbursementRequest
            .findMany({
                where: {
                    ...customWhere,
                },
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    merchant: {
                        select: {
                            uid: true,
                            full_name: true,
                        },
                    },
                },
            })
            .catch((err) => {
                console.log(err)
                throw new CustomError("Unable to get disbursement history", 500);
            });


        // res.setHeader('Content-Type', 'text/csv');
        // res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');

        const fields = [
            'merchant',
            'status',
            'requested_amount',
            'date_time'
        ];

        const data = disbursements.map(transaction => ({
            merchant: transaction.merchant.full_name,
            status: transaction.status,
            requested_amount: transaction.requestedAmount,
            date_time: transaction.createdAt
        }));

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);
        const csvNoQuotes = csv.replace(/"/g, '');
        return `${csvNoQuotes}`;
        // loop through disbursements and add transaction details
        // for (let i = 0; i < disbursements.length; i++) {
        //   if (!disbursements[i].transaction_id) {
        //     disbursements[i].transaction = null;
        //   } else {
        //     const transaction = await prisma.transaction.findFirst({
        //       where: {
        //         transaction_id: disbursements[i].transaction_id,
        //       },
        //     });
        //     disbursements[i].transaction = transaction;
        //   }
        // }
    } catch (error: any) {
        throw new CustomError(
            error?.error || "Unable to get disbursement",
            error?.statusCode || 500
        );
    }
};

export default {
    createDisbursementRequest,
    updateDisbursementRequestStatus,
    getDisbursementRequests,
    exportDisbursementRequest
}