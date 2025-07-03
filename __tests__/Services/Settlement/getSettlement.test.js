import { parse } from "date-fns";
import prisma from "../../../dist/prisma/client.js";
import CustomError from "../../../dist/utils/custom_error.js";
import { getSettlement } from "../../../dist/services/settlement/index.js";

jest.mock("../../../dist/prisma/client.js", () => ({
    settlementReport: {
        findMany: jest.fn(),
        count: jest.fn(), // Add this mock here
    },
}));

describe("getSettlement", () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear mocks after each test
    });

    it("should throw a CustomError if merchantId is missing and user is not Admin", async () => {
        const params = {};
        const user = { role: "User" }; // Not an Admin user

        expect.assertions(2);

        try {
            await getSettlement(params, user);
        } catch (error) {
            expect(error).toBeInstanceOf(CustomError);
            expect(error).toMatchObject({
                message: "Merchant ID is required",
                statusCode: 400,
            });
        }
    });

    it("should return settlements with meta for valid input", async () => {
        const mockReports = [
            {
                id: 1,
                settlementDate: new Date(),
                merchant_id: 123,
                amount: 100,
                merchant: {
                    uid: "merchant_uid_1",
                    full_name: "Merchant One",
                },
            },
        ];
    
        prisma.settlementReport.findMany.mockResolvedValue(mockReports);
        prisma.settlementReport.count.mockResolvedValue(1);
    
        const params = { start: "2025-01-01T00:00:00+00:00", end: "2025-01-31T23:59:59+00:00", page: "1", limit: "10" };
        const user = { merchant_id: 123, role: "Merchant" };
    
        const result = await getSettlement(params, user);
    
        expect(result).toEqual({
            transactions: mockReports.map((report) => ({
                ...report,
                jazzCashMerchant: report.merchant,
            })),
            meta: {
                total: 1,
                pages: 1,
                page: 1,
                limit: 10,
            },
        });
    
        // Updated Expectation
        expect(prisma.settlementReport.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                take: 10,
                where: expect.objectContaining({
                    merchant_id: 123,
                    settlementDate: {
                        gte: parse("2025-01-01T00:00:00+00:00", "yyyy-MM-dd'T'HH:mm:ssXXX", new Date()),
                        lt: parse("2025-01-31T23:59:59+00:00", "yyyy-MM-dd'T'HH:mm:ssXXX", new Date()),
                    },
                }),
                include: {
                    merchant: {
                        select: {
                            uid: true,
                            full_name: true,
                        },
                    },
                },
            })
        );
    
        expect(prisma.settlementReport.count).toHaveBeenCalledWith({
            where: {
                merchant_id: 123,
                settlementDate: {
                    gte: parse("2025-01-01T00:00:00+00:00", "yyyy-MM-dd'T'HH:mm:ssXXX", new Date()),
                    lt: parse("2025-01-31T23:59:59+00:00", "yyyy-MM-dd'T'HH:mm:ssXXX", new Date()),
                },
            },
        });
    });
    

    it("should return settlements without meta if page and limit are not provided", async () => {
        const mockReports = [
            {
                id: 1,
                settlementDate: new Date(),
                merchant_id: 123,
                amount: 100,
                merchant: {
                    uid: "merchant_uid_1",
                    full_name: "Merchant One",
                },
            },
        ];

        prisma.settlementReport.findMany.mockResolvedValue(mockReports);

        const params = { start: "2025-01-01T00:00:00+00:00", end: "2025-01-31T23:59:59+00:00" };
        const user = { merchant_id: 123, role: "Merchant" };

        const result = await getSettlement(params, user);

        expect(result).toEqual({
            transactions: mockReports.map((report) => ({
                ...report,
                jazzCashMerchant: report.merchant,
            })),
            meta: {},
        });
    });

    it("should return the error if an unexpected error occurs", async () => {
        const params = { merchant_id: "123" };
        const user = { role: "User" };

        const mockError = new Error("Unexpected error");

        prisma.settlementReport.findMany.mockRejectedValue(mockError);

        const result = await getSettlement(params, user);

        expect(result).toEqual(mockError);
    });
});
