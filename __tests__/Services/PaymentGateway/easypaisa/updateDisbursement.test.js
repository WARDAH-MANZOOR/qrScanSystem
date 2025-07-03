import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import { transactionService, merchantService, easyPaisaDisburse } from "../../../../dist/services/index.js";
import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import axios from "axios";
import Decimal from "decimal.js";

jest.mock("../../../../dist/services/index.js");
jest.mock("axios");
jest.mock("../../../../dist/prisma/client.js", () => ({
    merchant: {
        findFirst: jest.fn(),
    },
    easyPaisaMerchant: {
        findFirst: jest.fn(),
    },
    disbursement: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),  
    },
    $transaction: jest.fn(),
}));



describe("updateDisbursement", () => {
    const merchantId = "merchant123";
    const validObj = {
        order_id: "order001",
        account: "923001234567",
        merchantAmount: 1000,
        commission: 50,
        gst: 30,
        withholdingTax: 20,
        system_order_id: "sys001",
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should throw error if merchant is not found", async () => {
        merchantService.findOne.mockResolvedValue(null);

        await expect(easyPaisaService.updateDisbursement(validObj, merchantId)).rejects.toThrow("Merchant not found");
    });

    test("should throw error if merchant does not have a disbursement account", async () => {
        merchantService.findOne.mockResolvedValue({
            uid: merchantId,
            merchant_id: "mer123",
            EasyPaisaDisburseAccountId: null,
        });

        await expect(easyPaisaService.updateDisbursement(validObj, merchantId)).rejects.toThrow(
            "Disbursement account not assigned."
        );
    });

    test("should throw error if order ID already exists", async () => {
        merchantService.findOne.mockResolvedValue({
            uid: merchantId,
            merchant_id: "mer123",
            EasyPaisaDisburseAccountId: "epAccount123",
        });

        prisma.disbursement.findFirst.mockResolvedValue({ merchant_custom_order_id: "order001" });

        await expect(easyPaisaService.updateDisbursement(validObj, merchantId)).rejects.toThrow("Order ID already exists");
    });

    test("should throw error if phone number does not start with 92", async () => {
        const invalidObj = { ...validObj, account: "03001234567" };
    
        merchantService.findOne.mockResolvedValue({
            uid: merchantId,
            merchant_id: "mer123",
            EasyPaisaDisburseAccountId: "epAccount123",
        });
    
        prisma.disbursement.findFirst.mockResolvedValue(null); // Ensure order does not exist so phone validation runs
    
        // Ensure disbursement account retrieval is not blocking execution
        easyPaisaDisburse.getDisburseAccount.mockResolvedValue({
            data: {
                MSISDN: "923001234567",
                clientId: "id123",
                clientSecret: "secret123",
                xChannel: "channel123",
            },
        });
    
        await expect(easyPaisaService.updateDisbursement(invalidObj, merchantId)).rejects.toThrow("Number should start with 92");
    });
    
    test("should throw error if disbursement account is not found", async () => {
        merchantService.findOne.mockResolvedValue({
            uid: merchantId,
            merchant_id: "mer123",
            EasyPaisaDisburseAccountId: "epAccount123",
        });

        easyPaisaDisburse.getDisburseAccount.mockResolvedValue(null);

        await expect(easyPaisaService.updateDisbursement(validObj, merchantId)).rejects.toThrow("Disbursement account not found");
    });

    test("should throw database error during transaction", async () => {
        merchantService.findOne.mockResolvedValue({
            uid: merchantId,
            merchant_id: "mer123",
            EasyPaisaDisburseAccountId: "epAccount123",
        });

        prisma.disbursement.findFirst.mockResolvedValue(null);
        easyPaisaDisburse.getDisburseAccount.mockResolvedValue({
            data: {
                MSISDN: "923001234567",
                clientId: "id123",
                clientSecret: "secret123",
                xChannel: "channel123",
            },
        });

        axios.post.mockResolvedValue({
            data: {
                ResponseCode: 0,
                TransactionReference: "txn123",
                TransactionStatus: "Success",
            },
        });

        prisma.$transaction.mockRejectedValue(new Error("Database Error"));

        await expect(easyPaisaService.updateDisbursement(validObj, merchantId)).rejects.toThrow("Database Error");
    });

 
});
