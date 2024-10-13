import { parse } from "date-fns";
import { JwtPayload } from "jsonwebtoken";
import prisma from "prisma/client.js";
import CustomError from "utils/custom_error.js";

const getSettlement = async (params: any, user: JwtPayload) => {
    console.log(user);
    const merchantId = user?.merchant_id;


    if (!merchantId) {
        throw new CustomError("Merchant ID is required", 400);
    }

    const currentDate = new Date();
    let filters: { merchant_id: number } = { merchant_id: merchantId };

    try {
        const startDate = params?.start?.replace(" ", "+");
        const endDate = params?.end?.replace(" ", "+");

        const customWhere = {} as any;

        if (startDate && endDate) {
            const todayStart = parse(
                startDate,
                "yyyy-MM-dd'T'HH:mm:ssXXX",
                new Date()
            );
            const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

            customWhere["date_time"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }

        const reports = await prisma.settlementReport.findMany({
            where: {
                ...filters
            }
        })
        return reports;
    }
    catch (error: any) {
        return error;
    }
}

export { getSettlement };