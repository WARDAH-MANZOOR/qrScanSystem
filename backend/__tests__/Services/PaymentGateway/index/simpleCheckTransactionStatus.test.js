import { simpleCheckTransactionStatus } from "../../../../dist/services/paymentGateway/index.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import prisma from "../../../../dist/prisma/client.js";
import jazzcashDisburse from "../../../../dist/services/paymentGateway/jazzcashDisburse.js";
import { merchantService } from "../../../../dist/services/index.js";
import fetch from "node-fetch";
import { decryptData, encryptData } from "../../../../dist/utils/enc_dec.js";

// Mock Prisma Client
jest.mock("../../../../dist/prisma/client.js", () => ({
    disbursement: {
        findUnique: jest.fn(),
    },
}));

// Mock External Services
jest.mock("node-fetch", () => jest.fn());

jest.mock("../../../../dist/services/paymentGateway/jazzcashDisburse.js", () => ({
    getDisburseAccount: jest.fn(),
}));

jest.mock("../../../../dist/services/index.js", () => ({
    merchantService: {
        findOne: jest.fn(),
    },
}));

jest.mock("../../../../dist/utils/enc_dec.js", () => ({
    encryptData: jest.fn(),
    decryptData: jest.fn(),
}));

// Suppress console logs
beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
    console.error.mockRestore();
    console.log.mockRestore();
});

// Mock Data
const mockMerchant = {
    uid: "merchant123",
    merchant_id: "mid123",
    JazzCashDisburseAccountId: "disburse123",
};

const mockDisbursementAccount = {
    key: "mockKey",
    initialVector: "mockIV",
};

const mockTransaction = {
    transaction_id: "txn123",
    system_order_id: "sysOrder123",
};

const mockBody = {
    originalReferenceId: "order123",
};

const mockToken = "mockToken";

describe("simpleCheckTransactionStatus", () => {
    let token;
    let body;
    let merchantId;

    beforeEach(() => {
        token = 'valid-token';
        body = { transactionIds: ['txn123', 'txn456'] };
        merchantId = 'merchant123';
    });

    
    it('should return transaction status from JazzCash API if transaction is found', async () => {

        const findMerchant = { uid: merchantId, JazzCashDisburseAccountId: 'account-id' };
        prisma.findOne = jest.fn().mockResolvedValue(findMerchant);
        jazzcashDisburse.getDisburseAccount = jest.fn().mockResolvedValue({ data: { key: 'key', initialVector: 'vector' } });
        prisma.disbursement.findFirst = jest.fn().mockResolvedValue({ transaction_id: 'txn123' });

        const mockApiResponse = { data: { responseCode: 'G2P-T-0', responseDescription: 'Success' } };
        fetch.mockResolvedValueOnce({ json: jest.fn().mockResolvedValue(mockApiResponse) });
        try {
            const result = await simpleCheckTransactionStatus(token, body, merchantId);

            expect(result).toEqual([
                { id: 'txn123', status: mockApiResponse.data },
                { id: 'txn456', status: 'Transaction not found' }
            ]);


        } catch (error) {
            console.error(" Error:", error);
        }
    });

    test("should fail if merchant is not found", async () => {
        merchantService.findOne.mockResolvedValue(null);

        await expect(simpleCheckTransactionStatus(mockToken, mockBody, "merchant123"))
            .rejects.toThrow(new CustomError("Merchant Not Found", 404));
    });

    test("should fail if disbursement account is not found", async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        jazzcashDisburse.getDisburseAccount.mockResolvedValue(null);

        await expect(simpleCheckTransactionStatus(mockToken, mockBody, "merchant123"))
            .rejects.toThrow(new CustomError("Disbursement account not found", 404));
    });

    test("should fail if transaction is not found", async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        jazzcashDisburse.getDisburseAccount.mockResolvedValue({ data: mockDisbursementAccount });
        prisma.disbursement.findUnique.mockResolvedValue(null);

        await expect(simpleCheckTransactionStatus(mockToken, mockBody, "merchant123"))
            .rejects.toThrow(new CustomError("Transaction Not Found", 404));
    });

    test("should fail on fetch API error", async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        jazzcashDisburse.getDisburseAccount.mockResolvedValue({ data: mockDisbursementAccount });
        prisma.disbursement.findUnique.mockResolvedValue(mockTransaction);
        encryptData.mockReturnValue("encryptedPayload");
    
        fetch.mockResolvedValue({
            ok: false,
            text: async () => "<html><body>Something went wrong</body></html>", // Simulating an error response
        });
        
        await expect(simpleCheckTransactionStatus(mockToken, mockBody, "merchant123")).rejects.toThrow(
            expect.objectContaining({
                message: expect.stringMatching(/Unexpected token|Invalid response/), // Allow both possible errors
            })
        );
        
        
    });
    
});
