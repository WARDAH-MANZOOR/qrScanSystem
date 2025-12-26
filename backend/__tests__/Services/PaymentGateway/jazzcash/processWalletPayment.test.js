import axios from "axios";
import { processWalletPayment } from "../../../../dist/services/paymentGateway/jazzCash.js";
import * as transactionService from "../../../../dist/services/transactions/index.js";
import  prisma  from "../../../../dist/prisma/client.js"; // Mock Prisma Client
import { CustomError } from "../../../../dist/utils/custom_error.js"; // Assuming CustomError is imported from errors file

jest.mock('../../../../dist/prisma/client.js', () => ({
    transaction: {
        update: jest.fn(),
    },
    scheduledTask: {
        create: jest.fn(),
    },
}));

jest.mock("axios");
jest.mock("../../../../dist/services/transactions/index.js", () => ({
    sendCallback: jest.fn(),
}));

describe("processWalletPayment", () => {
    const sendData = {
        pp_Version: "1.1",
        pp_MerchantID: "merchantID123",
        pp_Password: "password123",
        pp_TxnRefNo: "ref123",
        pp_Amount: 10000,
        pp_TxnCurrency: "PKR",
        pp_TxnDateTime: "20250108123456",
        pp_TxnExpiryDateTime: "20250108140000",
        pp_ReturnURL: "https://example.com",
    };

    const refNo = "ref123";
    const txnRefNo = "txnRef123";
    const merchant = {
        merchant_id: "merchantID123",
        commissions: [{ settlementDuration: 2 }],
        webhook_url: "https://webhook.com",
    };
    const phone = "3001234567";
    const date = "2025-01-08T12:00:00+05:00";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should handle successful payment and update transaction status", async () => {
        axios.post.mockResolvedValue({
            data: {
                pp_ResponseCode: "000",
                pp_ResponseMessage: "Success",
                pp_Amount: 10000,
            },
        });

        prisma.transaction.update.mockResolvedValue({
            merchant_transaction_id: refNo,
            status: "completed",
            response_message: "Success",
        });

        prisma.scheduledTask.create.mockResolvedValue({});

        transactionService.sendCallback.mockResolvedValue({});

        await processWalletPayment(sendData, refNo, merchant, phone, date, txnRefNo);

        expect(axios.post).toHaveBeenCalledTimes(1);

        expect(prisma.transaction.update).toHaveBeenCalledWith({
            where: { merchant_transaction_id: refNo },
            data: { status: "completed", response_message: "Success" },
        });

        expect(prisma.scheduledTask.create).toHaveBeenCalledWith({
            data: {
                transactionId: txnRefNo,
                status: "pending",
                scheduledAt: expect.any(Date),
                executedAt: null,
            },
        });

        expect(transactionService.sendCallback).toHaveBeenCalledWith(
            merchant.webhook_url,
            expect.objectContaining({
                merchant_transaction_id: refNo,
                status: 'completed',
                date_time: '2025-01-08T12:00:00+05:00', // Mocked date-time
                merchant_id: 'merchantID123',
                original_amount: 100,
            }),
            '3001234567',
            'payin',
            true,
            false // Include the additional argument in the expectation
        );
        
    });

    it("should handle failed payment and update transaction status", async () => {
        axios.post.mockResolvedValue({
            data: {
                pp_ResponseCode: "001",
                pp_ResponseMessage: "Failure",
                pp_Amount: 10000,
            },
        });

        prisma.transaction.update.mockResolvedValue({
            merchant_transaction_id: refNo,
            status: "failed",
            response_message: "Failure",
        });

        await processWalletPayment(sendData, refNo, merchant, phone, date, txnRefNo);

        expect(axios.post).toHaveBeenCalledTimes(1);

        expect(prisma.transaction.update).toHaveBeenCalledWith({
            where: { merchant_transaction_id: refNo },
            data: { status: "failed", response_message: "Failure" },
        });

        expect(prisma.scheduledTask.create).not.toHaveBeenCalled();
        expect(transactionService.sendCallback).not.toHaveBeenCalled();
    });

    it("should throw an error if response is missing", async () => {
        axios.post.mockResolvedValue({ data: null });

        await expect(
            processWalletPayment(sendData, refNo, merchant, phone, date, txnRefNo)
        ).rejects.toThrow(CustomError);

        expect(prisma.transaction.update).not.toHaveBeenCalled();
        expect(prisma.scheduledTask.create).not.toHaveBeenCalled();
        expect(transactionService.sendCallback).not.toHaveBeenCalled();
    });

    it("should throw an error if transaction update fails", async () => {
        axios.post.mockResolvedValue({
            data: {
                pp_ResponseCode: "000",
                pp_ResponseMessage: "Success",
                pp_Amount: 10000,
            },
        });

        prisma.transaction.update.mockRejectedValue(new Error("DB error"));

        await expect(
            processWalletPayment(sendData, refNo, merchant, phone, date, txnRefNo)
        ).rejects.toThrow("DB error");

        expect(prisma.scheduledTask.create).not.toHaveBeenCalled();
    });
});
