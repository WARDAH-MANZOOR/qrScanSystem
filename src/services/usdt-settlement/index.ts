import { parseISO } from "date-fns";
import { Parser } from "json2csv";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";

const getUsdtSettlements = async (params: any, merchantId: string) => {
    try {
        const startDate = params?.start?.replace(" ", "+");
        const endDate = params?.end?.replace(" ", "+");

        const customWhere = {} as any;

        if (merchantId) {
            customWhere["merchant_id"] = +merchantId;
        }

        if (startDate && endDate) {
            const todayStart = parseISO(startDate as string);
            const todayEnd = parseISO(endDate as string);

            customWhere["date"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }

        let { page, limit } = params;
        // Query based on provided parameters
        let skip, take;
        if (page && limit) {
            skip = (+page > 0 ? parseInt(page as string) - 1 : parseInt(page as string)) * parseInt(limit as string);
            take = parseInt(limit as string);
        }
        let records = await prisma.uSDTSettlement.findMany({
            ...(skip && { skip: +skip }),
            ...(take && { take: +take }),
            where: {
                ...customWhere,
            },
            include: {
                merchant: true
            },
            orderBy: {
                date: 'desc'
            }
        });
        let records2 = records.map((record) => ({
            ...record,
            merchant_name: record.merchant.username,
        }));
        console.log("Records: ", records2);
        let meta = {};
        if (page && take) {
            // Get the total count of transactions
            const total = await prisma.uSDTSettlement.count({
                where: {
                    ...customWhere,

                },
            });

            // Calculate the total number of pages
            const pages = Math.ceil(total / +take);
            meta = {
                total,
                pages,
                page: parseInt(page as string),
                limit: take
            }
        }
        return { records: records2, meta };
    }
    catch (error: any) {
        console.log(error)
    }

}

const exportUsdtSettlements = async (merchantId: number, params: any) => {
    try {
        const startDate = params?.start?.replace(" ", "+");
        const endDate = params?.end?.replace(" ", "+");

        const customWhere = {} as any;

        if (merchantId) {
            customWhere["merchant_id"] = +merchantId;
        }

        if (startDate && endDate) {
            const todayStart = parseISO(startDate as string);
            const todayEnd = parseISO(endDate as string);

            customWhere["date"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }

        const disbursements = await prisma.uSDTSettlement
            .findMany({
                where: {
                    ...customWhere,
                },
                orderBy: {
                    date: "desc",
                },
                include: {
                    merchant: {
                        select: {
                            username: true,
                        },
                    },
                }
            })
            .catch((err) => {
                console.log(err)
                throw new CustomError("Unable to get disbursement history", 500);
            });

        const fields = [
            'merchant',
            'pkr_amount',
            'usdt_amount',
            'date',
            'wallet_address',
            'conversion_charges',
            'total_usdt',
            'usdt_pkr_rate'
        ];

        const data = disbursements.map(transaction => ({
            merchant: transaction.merchant.username,
            pkr_amount: transaction.pkr_amount,
            usdt_amount: transaction.usdt_amount,
            date: transaction.date,
            wallet_address: transaction.wallet_address,
            total_usdt: transaction.total_usdt,
            usdt_pkr_rate: transaction.usdt_pkr_rate,
            conversion_charges: transaction.conversion_charges
        }));

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);
        const csvNoQuotes = csv.replace(/"/g, '');
        return `${csvNoQuotes}`;
    } catch (error: any) {
        throw new CustomError(
            error?.error || "Unable to get disbursement",
            error?.statusCode || 500
        );
    }
};

export default {
    getUsdtSettlements,
    exportUsdtSettlements
}