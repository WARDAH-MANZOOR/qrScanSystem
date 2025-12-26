import easyPaisaDisburse from "../../../../dist/services/paymentGateway/easyPaisaDisburse.js";
import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";

// Mocking prisma
jest.mock("../../../../dist/prisma/client.js", () => ({
    easyPaisaDisburseAccount: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
    },
    $transaction: jest.fn(),
}));

// Mocking CustomError
jest.mock("../../../../dist/utils/custom_error.js", () => {
    return jest.fn().mockImplementation((message, statusCode) => {
        const error = new Error(message);
        error.statusCode = statusCode;
        return error;
    });
});

describe("getDisburseAccount", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should retrieve a disburse account successfully", async () => {
        const mockAccount = {
            id: 1,
            MSISDN: "1234567890",
            clientId: "client_123",
            clientSecret: "secret_123",
            xChannel: "channel_123",
            pin: "1234",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        prisma.easyPaisaDisburseAccount.findFirst.mockResolvedValue(mockAccount);

        const result = await easyPaisaDisburse.getDisburseAccount(1);

        expect(result).toEqual({
            message: "Disburse account retrieved successfully",
            data: mockAccount,
        });
        expect(prisma.easyPaisaDisburseAccount.findFirst).toHaveBeenCalledTimes(1);
        expect(prisma.easyPaisaDisburseAccount.findFirst).toHaveBeenCalledWith({
            where: { id: 1, deletedAt: null },
        });
    });

    it("should throw an error if account is not found", async () => {
        prisma.easyPaisaDisburseAccount.findFirst.mockResolvedValue(null);

        await expect(
            easyPaisaDisburse.getDisburseAccount(1)
        ).rejects.toThrow("Disburse account not found");

        expect(prisma.easyPaisaDisburseAccount.findFirst).toHaveBeenCalledTimes(1);
        expect(prisma.easyPaisaDisburseAccount.findFirst).toHaveBeenCalledWith({
            where: { id: 1, deletedAt: null },
        });
    });

    it("should retrieve multiple disburse accounts successfully", async () => {
        const mockAccounts = [
            { id: 1, MSISDN: "1234567890", clientId: "client_123", createdAt: new Date() },
            { id: 2, MSISDN: "0987654321", clientId: "client_456", createdAt: new Date() },
        ];

        prisma.easyPaisaDisburseAccount.findMany.mockResolvedValue(mockAccounts);

        const result = await easyPaisaDisburse.getDisburseAccount();

        expect(result).toEqual({
            message: "Disburse account retrieved successfully",
            data: mockAccounts,
        });
        expect(prisma.easyPaisaDisburseAccount.findMany).toHaveBeenCalledTimes(1);
        expect(prisma.easyPaisaDisburseAccount.findMany).toHaveBeenCalledWith({
            where: { deletedAt: null },
            orderBy: { id: "desc" },
        });
    });

    it("should return an empty array if no disburse accounts are found", async () => {
        prisma.easyPaisaDisburseAccount.findMany.mockResolvedValue([]);

        const result = await easyPaisaDisburse.getDisburseAccount();

        expect(result).toEqual({
            message: "Disburse account retrieved successfully",
            data: [],
        });
        expect(prisma.easyPaisaDisburseAccount.findMany).toHaveBeenCalledTimes(1);
        expect(prisma.easyPaisaDisburseAccount.findMany).toHaveBeenCalledWith({
            where: { deletedAt: null },
            orderBy: { id: "desc" },
        });
    });
    it("should throw a default error message if no error message is provided", async () => {
        prisma.easyPaisaDisburseAccount.findFirst.mockRejectedValue(null); // Simulating an error without a message
    
        await expect(
            easyPaisaDisburse.getDisburseAccount(1)
        ).rejects.toThrow("An error occurred while retrieving the disburse account");
    
        expect(prisma.easyPaisaDisburseAccount.findFirst).toHaveBeenCalledTimes(1);
        expect(prisma.easyPaisaDisburseAccount.findFirst).toHaveBeenCalledWith({
            where: { id: 1, deletedAt: null },
        });
    });
    it("should handle errors when findMany fails", async () => {
        // Simulating an error when findMany fails
        prisma.easyPaisaDisburseAccount.findMany.mockRejectedValue(new Error("Database error"));
    
        // The function should throw a CustomError with the message from the exception
        await expect(
            easyPaisaDisburse.getDisburseAccount() // No accountId, so it uses findMany
        ).rejects.toThrow("Database error");
    
        // Ensure that findMany is called
        expect(prisma.easyPaisaDisburseAccount.findMany).toHaveBeenCalledTimes(1);
        expect(prisma.easyPaisaDisburseAccount.findMany).toHaveBeenCalledWith({
            where: { deletedAt: null },
            orderBy: { id: "desc" },
        });
    });
    
    it("should handle unexpected errors", async () => {
        prisma.easyPaisaDisburseAccount.findFirst.mockRejectedValue(new Error("Database error"));

        await expect(
            easyPaisaDisburse.getDisburseAccount(1)
        ).rejects.toThrow("Database error");

        expect(prisma.easyPaisaDisburseAccount.findFirst).toHaveBeenCalledTimes(1);
        expect(prisma.easyPaisaDisburseAccount.findFirst).toHaveBeenCalledWith({
            where: { id: 1, deletedAt: null },
        });
    });
});
