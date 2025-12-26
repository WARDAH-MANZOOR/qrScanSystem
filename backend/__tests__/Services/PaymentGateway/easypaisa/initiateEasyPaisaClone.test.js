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
      findMany: jest.fn(),
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

describe("initiateEasyPaisaClone", () => {
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
        try {
            await easyPaisaService.initiateEasyPaisaClone(null, {});
        } catch (error) {
            expect(error).to.be.instanceOf(CustomError);
            expect(error.message).to.equal("Merchant ID is required");
            expect(error.statusCode).to.equal(400);
        }
    });
    it("should return error if merchant is not found", async () => {
        prisma.merchant.findFirst.mockResolvedValue(null);

        try {
            await easyPaisaService.initiateEasyPaisaClone("merchant123", {});
        } catch (error) {
            expect(error).to.be.instanceOf(CustomError);
            expect(error.message).to.equal("Merchant not found");
            expect(error.statusCode).to.equal(404);
        }
    });

    it("should return error if easypaisa gateway merchant is not found", async () => {
        prisma.merchant.findFirst.mockResolvedValue({
            uid: merchantId,
            easyPaisaMerchantId: "ep_123",
            commissions: [{ commissionMode: "SINGLE", commissionGST: 10, commissionRate: 5, commissionWithHoldingTax: 3 }]
        });
        prisma.easyPaisaMerchant.findMany.mockResolvedValue([]); // Corrected mock for findMany

        try {
            await easyPaisaService.initiateEasyPaisaClone("merchant123", {});
        } catch (error) {
            expect(error).to.be.instanceOf(CustomError);
            expect(error.message).to.equal("Gateway merchant not found");
            expect(error.statusCode).to.equal(404);
        }
    });


    it("should successfully initiate a transaction and return success response", async () => {
        prisma.merchant.findFirst.mockResolvedValue({
            uid: merchantId,
            easyPaisaMerchantId: "ep_123",
            commissions: [{ commissionMode: "SINGLE", commissionGST: 10, commissionRate: 5, commissionWithHoldingTax: 3 }],
            webhook_url: "http://webhook.url",
            encrypted: "True"
        });

        prisma.easyPaisaMerchant.findMany.mockResolvedValue([{ 
            storeId: "store_001", 
            username: "user", 
            credentials: "pass", 
            id: "ep_123" 
        }]);

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

        const response = await easyPaisaService.initiateEasyPaisaClone(merchantId, params);
        expect(response).toEqual({
            txnNo: "m_txn_001",
            txnDateTime: "2024-02-09T12:00:00Z",
            statusCode: "0000"
        });
    });
});
