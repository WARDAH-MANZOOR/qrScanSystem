import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import { getEligibleTransactions } from "../../../../dist/services/paymentGateway/disbursement.js"; // Update with the actual path to your function

jest.mock("../../../../dist/prisma/client.js", () => ({
    transaction: {
        findMany: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
    },
}));

describe("getEligibleTransactions", () => {
    const mockMerchantId = "merchant123";

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should return eligible transactions when merchant exists", async () => {
        // Mock checkMerchantExists to return true
        prisma.user.findUnique.mockResolvedValueOnce({ id: mockMerchantId });

        // Mock eligible transactions
        const mockTransactions = [
            {
                transaction_id: "txn1",
                settled_amount: new Decimal(100),
                balance: new Decimal(50),
                original_amount: new Decimal(150),
            },
            {
                transaction_id: "txn2",
                settled_amount: new Decimal(200),
                balance: new Decimal(100),
                original_amount: new Decimal(300),
            },
        ];

        prisma.transaction.findMany.mockResolvedValueOnce(mockTransactions);

        const result = await getEligibleTransactions(mockMerchantId, prisma);

        expect(result).toEqual(mockTransactions);
        expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockMerchantId } });
        expect(prisma.transaction.findMany).toHaveBeenCalledWith({
            where: {
                settlement: true,
                merchant_id: mockMerchantId,
                balance: { gt: new Decimal(0) },
            },
            orderBy: { date_time: "asc" },
            select: {
                transaction_id: true,
                settled_amount: true,
                balance: true,
                original_amount: true,
            },
        });
    });

    it("should throw an error when merchant does not exist", async () => {
        // Mock checkMerchantExists to return false
        prisma.user.findUnique.mockResolvedValueOnce(null);

        await expect(getEligibleTransactions(mockMerchantId, prisma)).rejects.toThrow(
            new CustomError("Merchant not found", 404)
        );

        expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockMerchantId } });
        expect(prisma.transaction.findMany).not.toHaveBeenCalled();
    });

    it("should return an empty array if there are no eligible transactions", async () => {
        // Mock checkMerchantExists to return true
        prisma.user.findUnique.mockResolvedValueOnce({ id: mockMerchantId });

        // Mock no eligible transactions
        prisma.transaction.findMany.mockResolvedValueOnce([]);

        const result = await getEligibleTransactions(mockMerchantId, prisma);

        expect(result).toEqual([]);
        expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockMerchantId } });
        expect(prisma.transaction.findMany).toHaveBeenCalledWith({
            where: {
                settlement: true,
                merchant_id: mockMerchantId,
                balance: { gt: new Decimal(0) },
            },
            orderBy: { date_time: "asc" },
            select: {
                transaction_id: true,
                settled_amount: true,
                balance: true,
                original_amount: true,
            },
        });
    });
});
