import disbursementRequestService from '../../../dist/services/disbursementRequest/index.js'; // Update this path to where your function is located
import prisma from "../../../dist/prisma/client.js";
import { backofficeService } from "../../../dist/services/index.js";
import { getWalletBalance } from "../../../dist/services/paymentGateway/disbursement.js";
import CustomError from "../../../dist/utils/custom_error.js";

// Mock the external dependencies
jest.mock("../../../dist/prisma/client.js", () => ({
    disbursementRequest: {
        update: jest.fn()
    },
    merchant: {
        update: jest.fn()
    }
}));
jest.mock("../../../dist/services/paymentGateway/disbursement.js");
jest.mock("../../../dist/services/index.js");

describe("updateDisbursementRequestStatus", () => {
    const requestId = 1;
    const statusApproved = "approved";
    const statusRejected = "rejected";
    const requestedAmount = 1000;
    const merchantId = 123;
    const mockWalletBalance = 5000;

    const disbursementRequestMock = {
        id: requestId,
        status: statusApproved,
        requestedAmount,
        merchantId
    };

    beforeEach(() => {
        // Reset mocks before each test
        prisma.disbursementRequest.update.mockReset();
        prisma.merchant.update.mockReset();
        getWalletBalance.mockReset();
        backofficeService.adjustMerchantWalletBalance.mockReset();
    });

    it("should update the disbursement request status to 'approved' and update merchant balance", async () => {
        // Arrange: Mock the disbursement request update and merchant update
        prisma.disbursementRequest.update.mockResolvedValueOnce(disbursementRequestMock);
        prisma.merchant.update.mockResolvedValueOnce({});

        // Act: Call the function with 'approved' status
        await disbursementRequestService.updateDisbursementRequestStatus(requestId, statusApproved);

        // Assert: Check if disbursement request update was called with correct arguments
        expect(prisma.disbursementRequest.update).toHaveBeenCalledWith({
            where: { id: requestId },
            data: { status: statusApproved }
        });

        // Assert: Check if merchant balance update was called with the correct incremented value
        expect(prisma.merchant.update).toHaveBeenCalledWith({
            where: { merchant_id: disbursementRequestMock.merchantId },
            data: { balanceToDisburse: { increment: requestedAmount } }
        });
    });

    it("should update the disbursement request status to 'rejected' and adjust merchant wallet balance", async () => {
        // Arrange: Mock the disbursement request update and get wallet balance
        prisma.disbursementRequest.update.mockResolvedValueOnce(disbursementRequestMock);
        getWalletBalance.mockResolvedValueOnce({ walletBalance: mockWalletBalance });

        // Act: Call the function with 'rejected' status
        await disbursementRequestService.updateDisbursementRequestStatus(requestId, statusRejected);

        // Assert: Check if disbursement request update was called with correct arguments
        expect(prisma.disbursementRequest.update).toHaveBeenCalledWith({
            where: { id: requestId },
            data: { status: statusRejected }
        });

        // Assert: Calculate the updated wallet balance and check if the adjustment was called
        const updatedAvailableBalance = mockWalletBalance + requestedAmount;
        expect(backofficeService.adjustMerchantWalletBalance).toHaveBeenCalledWith(
            disbursementRequestMock.merchantId,
            updatedAvailableBalance,
            false
        );
    });

    it("should throw a CustomError when an error occurs", async () => {
        // Arrange: Mock a failure in the disbursement request update
        prisma.disbursementRequest.update.mockRejectedValueOnce(new Error("Database error"));

        // Act & Assert: Test if the error is thrown
        await expect(disbursementRequestService.updateDisbursementRequestStatus(requestId, statusApproved))
            .rejects
            .toThrow(new CustomError("Database error", 500));
    });
});