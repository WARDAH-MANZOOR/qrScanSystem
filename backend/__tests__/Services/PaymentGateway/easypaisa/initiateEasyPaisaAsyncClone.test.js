import { transactionService } from "../../../../dist/services/index.js";
import axios from "axios";
import prisma from "../../../../dist/prisma/client.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import CustomError from "../../../../dist/utils/custom_error.js";

// Mock Prisma and Services
jest.mock("../../../../dist/prisma/client.js", () => ({
    merchant: {
      findFirst: jest.fn(),
    },
    easyPaisaMerchant: {
      findFirst: jest.fn(),
    },
}));

jest.mock("../../../../dist/services/index.js");
jest.mock("axios");

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    console.error.mockRestore();
});

describe("initiateEasyPaisaAsyncClone", () => {
    let merchantId, params;

    beforeEach(() => {
        merchantId = "merchant_123";
        params = {
            phone: "03123456789",
            amount: 1000,
            email: "test@example.com",
            order_id: "order_001",
            type: "payment"
        };
    });
    
    it("should return error if merchantId is not provided", async () => {
        await expect(easyPaisaService.initiateEasyPaisaAsyncClone(null, {}))
            .resolves.toEqual({
                message: "Merchant ID is required",
                statusCode: 400,
                txnNo: null
            });
    });

    it("should return error if merchant is not found", async () => {
        prisma.merchant.findFirst.mockResolvedValue(null);

        await expect(easyPaisaService.initiateEasyPaisaAsyncClone(merchantId, params))
            .resolves.toEqual({
                message: "Merchant not found",
                statusCode: 404,
                txnNo: null
            });
    });

    it("should return error if easypaisa gateway merchant is not found", async () => {
        prisma.merchant.findFirst.mockResolvedValue({
            uid: merchantId,
            easyPaisaMerchantId: "ep_123",
            commissions: [{ commissionMode: "SINGLE", commissionGST: 10, commissionRate: 5, commissionWithHoldingTax: 3 }]
        });

        prisma.easyPaisaMerchant.findFirst.mockResolvedValue(null);

        await expect(easyPaisaService.initiateEasyPaisaAsyncClone(merchantId, params))
            .resolves.toEqual({
                message: "Gateway merchant not found",
                statusCode: 404,
                txnNo: null
            });
    });

    it("should successfully initiate a transaction and return a pending response", async () => {
        prisma.merchant.findFirst.mockResolvedValue({
            uid: merchantId,
            easyPaisaMerchantId: "ep_123",
            commissions: [{ 
                commissionMode: "SINGLE", 
                commissionGST: 10, 
                commissionRate: 5, 
                commissionWithHoldingTax: 3,
                settlementDuration: 5 
            }],
            webhook_url: "http://webhook.url"
        });

        prisma.easyPaisaMerchant.findFirst.mockResolvedValue({
            storeId: "store_001", 
            username: "user", 
            credentials: "pass", 
            id: "ep_123"
        });

        transactionService.convertPhoneNumber.mockReturnValue("923123456789");
        transactionService.createTransactionId.mockReturnValue("txn_001");
        transactionService.createTxn.mockResolvedValue({
            transaction_id: "txn_001", 
            merchant_transaction_id: "m_txn_001", 
            date_time: "2024-02-09T12:00:00Z"
        });

        axios.request.mockResolvedValue({ data: { responseCode: "0000", responseDesc: "Transaction Successful" } });
        transactionService.updateTxn.mockResolvedValue(true);
        transactionService.sendCallback.mockResolvedValue(true);

        const response = await easyPaisaService.initiateEasyPaisaAsyncClone(merchantId, params);

        expect(response).toEqual({
            txnNo: "m_txn_001",
            txnDateTime: "2024-02-09T12:00:00Z",
            statusCode: "pending"
        });

        // Wait for setImmediate() code execution
        await new Promise(setImmediate);

        // Ensure transaction was updated successfully
        expect(transactionService.updateTxn).toHaveBeenCalledWith(
            "txn_001",
            {
                status: "completed",
                response_message: "Transaction Successful"
            },
            5
        );

        expect(transactionService.sendCallback).toHaveBeenCalledWith(
            "http://webhook.url",
            expect.any(Object),
            "923123456789",
            "payin",
            true,
            true
        );
    });

    it("should handle transaction failure and update status", async () => {
        prisma.merchant.findFirst.mockResolvedValue({
            uid: merchantId,
            easyPaisaMerchantId: "ep_123",
            commissions: [{ 
                commissionMode: "SINGLE", 
                commissionGST: 10, 
                commissionRate: 5, 
                commissionWithHoldingTax: 3,
                settlementDuration: 5 
            }],
            webhook_url: "http://webhook.url"
        });

        prisma.easyPaisaMerchant.findFirst.mockResolvedValue({
            storeId: "store_001", 
            username: "user", 
            credentials: "pass", 
            id: "ep_123"
        });

        transactionService.convertPhoneNumber.mockReturnValue("923123456789");
        transactionService.createTransactionId.mockReturnValue("txn_002");
        transactionService.createTxn.mockResolvedValue({
            transaction_id: "txn_002", 
            merchant_transaction_id: "m_txn_002", 
            date_time: "2024-02-09T12:05:00Z"
        });

        axios.request.mockResolvedValue({ data: { responseCode: "9999", responseDesc: "Transaction Failed" } });
        transactionService.updateTxn.mockResolvedValue(true);

        const response = await easyPaisaService.initiateEasyPaisaAsyncClone(merchantId, params);

        expect(response).toEqual({
            txnNo: "m_txn_002",
            txnDateTime: "2024-02-09T12:05:00Z",
            statusCode: "pending"
        });

        // Wait for setImmediate() execution
        await new Promise(setImmediate);

        // Ensure failed transaction update is called
        expect(transactionService.updateTxn).toHaveBeenCalledWith(
            "txn_002",
            {
                status: "failed",
                response_message: "Transaction Failed"
            },
            5
        );
    });

    it("should handle axios request failure", async () => {
        prisma.merchant.findFirst.mockResolvedValue({
            uid: merchantId,
            easyPaisaMerchantId: "ep_123",
            commissions: [{ 
                commissionMode: "SINGLE", 
                commissionGST: 10, 
                commissionRate: 5, 
                commissionWithHoldingTax: 3,
                settlementDuration: 5 
            }]
        });

        prisma.easyPaisaMerchant.findFirst.mockResolvedValue({
            storeId: "store_001", 
            username: "user", 
            credentials: "pass", 
            id: "ep_123"
        });

        transactionService.convertPhoneNumber.mockReturnValue("923123456789");
        transactionService.createTransactionId.mockReturnValue("txn_003");
        transactionService.createTxn.mockResolvedValue({
            transaction_id: "txn_003", 
            merchant_transaction_id: "m_txn_003", 
            date_time: "2024-02-09T12:10:00Z"
        });

        axios.request.mockRejectedValue(new Error("Network Error"));

        const response = await easyPaisaService.initiateEasyPaisaAsyncClone(merchantId, params);

        expect(response.statusCode).toBe("pending");

        await new Promise(setImmediate);

        expect(transactionService.updateTxn).toHaveBeenCalledWith(
            "txn_003",
            {
                status: "failed",
                response_message: "Network Error"
            },
            5
        );
    });
});
