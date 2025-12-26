import disbursementRequestService from '../../../dist/services/disbursementRequest/index.js'; // Update this path to where your function is located
import prisma from "../../../dist/prisma/client.js";
import { backofficeService } from "../../../dist/services/index.js";
import { getWalletBalance } from "../../../dist/services/paymentGateway/disbursement.js";
import CustomError from "../../../dist/utils/custom_error.js";

// Mock the external dependencies
jest.mock("../../../dist/prisma/client.js", () => ({
    disbursementRequest: {
        create: jest.fn()
    }
}));
jest.mock("../../../dist/services/paymentGateway/disbursement.js");
jest.mock("../../../dist/services/index.js");

describe("createDisbursementRequest", () => {
    const requestedAmount = 1000;
    const merchantId = 123;
    const mockWalletBalance = 5000;

    beforeEach(() => {
        // Reset mocks before each test
        getWalletBalance.mockReset();
        backofficeService.adjustMerchantWalletBalance.mockReset();
    });

    it("should create a disbursement request and adjust merchant wallet balance", async () => {
        // Arrange: Mock the wallet balance retrieval
        getWalletBalance.mockResolvedValueOnce({ walletBalance: mockWalletBalance });

        // Act: Call the function
        await disbursementRequestService.createDisbursementRequest(requestedAmount, merchantId);

        // Assert: Check if prisma and other services are called with correct arguments
        expect(prisma.disbursementRequest.create).toHaveBeenCalledWith({
            data: {
                requestedAmount,
                merchantId,
                status: "pending",
            }
        });

        const updatedAvailableBalance = mockWalletBalance - requestedAmount;
        expect(backofficeService.adjustMerchantWalletBalance).toHaveBeenCalledWith(
            merchantId,
            updatedAvailableBalance,
            false
        );
    });

    it("should throw a CustomError when an error occurs", async () => {
        // Arrange: Mock a failure in the prisma service
        prisma.disbursementRequest.create.mockRejectedValueOnce(new Error("Database error"));

        // Act & Assert: Test if the error is thrown
        await expect(disbursementRequestService.createDisbursementRequest(requestedAmount, merchantId))
            .rejects
            .toThrow(new CustomError("Database error", 500));
    });
});
