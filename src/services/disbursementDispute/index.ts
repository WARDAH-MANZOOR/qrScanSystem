import { parse, parseISO } from "date-fns";
import { Parser } from "json2csv";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";

const createDisbursementDispute = async (body: any, merchant_id: number) => {
    try {
        return await prisma.$transaction(async (tx) => {
            const disbursementDispute = await tx.disbursementDispute.create({
                data: {
                    account: body.account,
                    disbursementDate: new Date(body.disbursementDate),
                    amount: Number(body.amount),
                    merchant_id,
                    sender: body.sender,
                    transactionId: body.transactionId,
                    message: body?.message,
                    status: body?.status,
                    orderId: body?.orderId
                }
            });
            return disbursementDispute;
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

const updateDisbursementDispute = async (requestId: number, body: any) => {
    try {
        const disbursementDispute = await prisma.disbursementDispute.update({
            where: { id: requestId },
            data: { status: body?.status, message: body?.message }
        });
        return {
            id: disbursementDispute.id,
            status: disbursementDispute.status,
            message: disbursementDispute.message
        }
    }
    catch (err: any) {
        throw new CustomError(err.message, 500);
    }
}

const getDisbursementDisputes = async (params: any, merchantId: any) => {
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

            customWhere["disbursementDate"] = {
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
        const disputes = await prisma.disbursementDispute.findMany({
            ...(skip && { skip: +skip }),
            ...(take && { take: +take }),
            where: {
                ...(merchantId && { merchant_id: parseInt(merchantId as string) }),
                ...customWhere,
            },
            orderBy: {
                disbursementDate: "desc",
            },
            include: {
                merchant: true
            }
        });

        let meta = {};
        if (page && take) {
            // Get the total count of transactions
            const total = await prisma.disbursementDispute.count(
                {
                    where: {
                        ...(merchantId && { merchant_id: parseInt(merchantId as string) }),
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
            disputes: disputes.map((dispute) => ({
                ...dispute,
                merchant: null,
                merchant_name: dispute.merchant.full_name
            })),
            meta,
        };

        return response;
    } catch (err) {
        console.log(err)
        throw new CustomError("Internal Server Error", 500);
    }
};

const exportDisbursementDispute = async (merchantId: number, params: any) => {
    try {
        const startDate = params?.start?.replace(" ", "+");
        const endDate = params?.end?.replace(" ", "+");

        const customWhere = {
        } as any;

        if (merchantId) {
            customWhere["merchant_id"] = +merchantId;
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

        const disputes = await prisma.disbursementDispute
            .findMany({
                where: {
                    ...customWhere,
                },
                orderBy: {
                    disbursementDate: "desc",
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
            'order_id',
            'transaction_id',
            'message'
        ];

        const data = disputes.map(dispute => ({
            merchant: dispute.merchant.full_name,
            status: dispute.status,
            order_id: dispute.orderId,
            transaction_id: dispute.transactionId,
            message: dispute.message
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
    createDisbursementDispute,
    updateDisbursementDispute,
    getDisbursementDisputes,
    exportDisbursementDispute
}