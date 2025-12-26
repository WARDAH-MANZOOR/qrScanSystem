import easyPaisaDisburse from "../../../../dist/services/paymentGateway/easyPaisaDisburse.js";
import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";

jest.mock("../../../../dist/prisma/client.js", () => ({
    $transaction: jest.fn(),
}));

jest.mock("../../../../dist/utils/custom_error.js", () => {
    return jest.fn().mockImplementation((message, statusCode) => {
        const error = new Error(message);
        error.statusCode = statusCode;
        return error;
    });
});

describe("deleteDisburseAccount", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should delete a disburse account successfully", async () => {
        const mockDeletedAccount = {
            id: 1,
            MSISDN: "1234567890",
            clientId: "client_123",
            clientSecret: "secret_123",
            xChannel: "channel_123",
            pin: "1234",
            deletedAt: new Date(),
        };

        prisma.$transaction.mockImplementationOnce(async (callback) =>
            callback({
                easyPaisaDisburseAccount: {
                    update: jest.fn().mockResolvedValue(mockDeletedAccount),
                },
            })
        );

        const result = await easyPaisaDisburse.deleteDisburseAccount(1);

        expect(result).toEqual({
            message: "Disburse account deleted successfully",
            data: mockDeletedAccount,
        });
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should throw an error if account deletion fails", async () => {
        prisma.$transaction.mockImplementationOnce(async () => {
            throw new Error("Database error");
        });

        await expect(
            easyPaisaDisburse.deleteDisburseAccount(1)
        ).rejects.toThrow("Database error");

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should throw a CustomError for invalid accountId", async () => {
        const invalidAccountId = 999;

        prisma.$transaction.mockImplementationOnce(async () => {
            throw new CustomError("An error occurred while deleting the disburse account", 500);
        });

        await expect(
            easyPaisaDisburse.deleteDisburseAccount(invalidAccountId)
        ).rejects.toThrow("An error occurred while deleting the disburse account");

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
});
