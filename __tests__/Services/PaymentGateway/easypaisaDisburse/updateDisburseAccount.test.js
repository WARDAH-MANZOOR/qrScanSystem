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

describe("updateDisburseAccount", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should update a disburse account successfully", async () => {
        const mockUpdatedAccount = {
            id: 1,
            MSISDN: "1234567890",
            clientId: "client_123",
            clientSecret: "secret_123",
            xChannel: "channel_123",
            pin: "5678", // Updated pin
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        prisma.$transaction.mockImplementationOnce(async (callback) =>
            callback({
                easyPaisaDisburseAccount: {
                    update: jest.fn().mockResolvedValue(mockUpdatedAccount),
                },
            })
        );

        const payload = {
            MSISDN: "1234567890",
            clientId: "client_123",
            clientSecret: "secret_123",
            xChannel: "channel_123",
            pin: "5678",
        };

        const result = await easyPaisaDisburse.updateDisburseAccount(1, payload);

        expect(result).toEqual({
            message: "Disburse account updated successfully",
            data: mockUpdatedAccount,
        });
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should throw an error if account update fails", async () => {
        prisma.$transaction.mockImplementationOnce(async () => {
            throw new Error("Database error");
        });

        const payload = {
            MSISDN: "1234567890",
            clientId: "client_123",
            clientSecret: "secret_123",
            xChannel: "channel_123",
            pin: "5678",
        };

        await expect(
            easyPaisaDisburse.updateDisburseAccount(1, payload)
        ).rejects.toThrow("Database error");

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should throw a CustomError for invalid payload", async () => {
        const payload = {}; // Invalid payload

        prisma.$transaction.mockImplementationOnce(async () => {
            throw new CustomError("An error occurred while updating the disburse account", 500);
        });

        await expect(
            easyPaisaDisburse.updateDisburseAccount(1, payload)
        ).rejects.toThrow("An error occurred while updating the disburse account");

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
});
