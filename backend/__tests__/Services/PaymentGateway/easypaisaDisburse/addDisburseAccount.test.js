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


describe("addDisburseAccount", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should create a disburse account successfully", async () => {
        const mockNewAccount = {
            id: 1,
            MSISDN: "1234567890",
            clientId: "client_123",
            clientSecret: "secret_123",
            xChannel: "channel_123",
            pin: "1234",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        prisma.$transaction.mockImplementationOnce(async (callback) =>
            callback({
                easyPaisaDisburseAccount: {
                    create: jest.fn().mockResolvedValue(mockNewAccount),
                },
            })
        );

        const payload = {
            MSISDN: "1234567890",
            clientId: "client_123",
            clientSecret: "secret_123",
            xChannel: "channel_123",
            pin: "1234",
        };

        const result = await easyPaisaDisburse.addDisburseAccount(payload);

        expect(result).toEqual({
            message: "Disburse account created successfully",
            data: mockNewAccount,
        });
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should throw an error if account creation fails", async () => {
        prisma.$transaction.mockImplementationOnce(() => {
            throw new Error("Database error");
        });

        const payload = {
            MSISDN: "1234567890",
            clientId: "client_123",
            clientSecret: "secret_123",
            xChannel: "channel_123",
            pin: "1234",
        };

        await expect(
            easyPaisaDisburse.addDisburseAccount(payload)
        ).rejects.toThrow("Database error");

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("should throw a CustomError for invalid payload", async () => {
        const payload = {}; // Invalid payload

        prisma.$transaction.mockImplementationOnce(async () => {
            throw new CustomError("An error occurred while creating the disburse account", 500);
        });

        await expect(
            easyPaisaDisburse.addDisburseAccount(payload)
        ).rejects.toThrow("An error occurred while creating the disburse account");

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
});