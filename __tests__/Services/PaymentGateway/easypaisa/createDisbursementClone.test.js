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
const mockMerchant = {
    uid: "merchant123",
    merchant_id: 1,
    balanceToDisburse: new Decimal(10000),
    EasyPaisaDisburseAccountId: "1234567890",
    payout_callback: "https://callback.url",
    webhook_url: "https://webhook.url",
    callback_mode: "DOUBLE",
    encrypted: "false",
};

const mockDisburseAccount = {
    MSISDN: "923001234567",
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    xChannel: "test-channel",
};
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe("createDisbursementClone", () => {
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
    
    
    it("should throw an error if the merchant is not found", async () => {
        merchantService.findOne.mockResolvedValue(null);
        await expect(easyPaisaService.createDisbursementClone({ amount: "100" }, "invalidMerchant"))
            .rejects.toThrow("Merchant not found");
    });

    it("should throw an error if the merchant does not have a disbursement account", async () => {
        merchantService.findOne.mockResolvedValue({ ...mockMerchant, EasyPaisaDisburseAccountId: null });
        await expect(easyPaisaService.createDisbursementClone({ amount: "100" }, "merchant123"))
            .rejects.toThrow("Disbursement account not assigned.");
    });

    it("should throw an error if order ID already exists", async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        prisma.disbursement.findFirst.mockResolvedValue({});
        await expect(easyPaisaService.createDisbursementClone({ amount: "100", order_id: "order123" }, "merchant123"))
            .rejects.toThrow("Order ID already exists");
    });
    

    it("should throw an error if phone number does not start with 92", async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        prisma.disbursement.findFirst.mockResolvedValue(null);
        easyPaisaDisburse.getDisburseAccount.mockResolvedValue({ data: mockDisburseAccount });
        await expect(easyPaisaService.createDisbursementClone({ amount: "100", phone: "03001234567" }, "merchant123"))
            .rejects.toThrow("Number should start with 92");
    });
   
 
});
