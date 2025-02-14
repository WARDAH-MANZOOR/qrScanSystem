import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import { merchantService, easyPaisaDisburse } from "../../../../dist/services/index.js";
import axios from "axios";
import CustomError from "../../../../dist/utils/custom_error.js";
import prisma from "../../../../dist/prisma/client.js";

jest.mock("../../../../dist/services/index.js");
jest.mock("axios");

beforeEach(() => {
    // Explicitly mock the disbursement findFirst method
    prisma.disbursement.findFirst = jest.fn();
});
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe("transactionInquiry", () => {
    it("should throw an error if merchant is not found", async () => {
        merchantService.findOne.mockResolvedValue(null); // No merchant found

        await expect(easyPaisaService.transactionInquiry({ transactionId: "123" }, "invalidMerchantId"))
            .rejects
            .toThrowError(new CustomError("Merchant not found", 404));
    });

    it("should throw an error if disbursement account is not assigned", async () => {
        const mockMerchant = { EasyPaisaDisburseAccountId: null };

        merchantService.findOne.mockResolvedValue(mockMerchant);

        await expect(easyPaisaService.transactionInquiry({ transactionId: "123" }, "validMerchantId"))
            .rejects
            .toThrowError(new CustomError("Disbursement account not assigned.", 404));
    });

    it("should throw an error if disbursement account is not found", async () => {
        const mockMerchant = { EasyPaisaDisburseAccountId: "validAccountId" };
        merchantService.findOne.mockResolvedValue(mockMerchant);

        easyPaisaDisburse.getDisburseAccount.mockResolvedValue(null); // No disbursement account found

        await expect(easyPaisaService.transactionInquiry({ transactionId: "123" }, "validMerchantId"))
            .rejects
            .toThrowError(new CustomError("Disbursement account not found", 404));
    });

    it("should throw an error if transaction is not found", async () => {
        const mockMerchant = { EasyPaisaDisburseAccountId: "validAccountId", merchant_id: "merchant123" };
        merchantService.findOne.mockResolvedValue(mockMerchant);
    
        easyPaisaDisburse.getDisburseAccount.mockResolvedValue(null); // No disbursement account found
    
        await expect(easyPaisaService.transactionInquiry({ transactionId: "123" }, "validMerchantId"))
            .rejects
            .toThrowError(new CustomError("Disbursement account not found", 404)); // Correct the error message here
    });
    

    it('should throw an error if transaction response code is not 0', async () => {
        const mockMerchant = { EasyPaisaDisburseAccountId: "12345" };
        easyPaisaDisburse.getDisburseAccount.mockResolvedValue({ clientId: "test" });

        // Mock the service to return the mockMerchant
        merchantService.findOne.mockResolvedValue(mockMerchant);

        // Mocking a valid transaction
        prisma.disbursement.findFirst.mockResolvedValue({ transaction_id: "transaction123" });

        // Mocking the axios response to have a non-zero response code
        axios.request.mockResolvedValue({ data: { ResponseCode: "1" } });
    
        try {
            await easyPaisaService.transactionInquiry({ transactionId: "123" }, "validMerchantId");
            expect(error.message).toBe("Error while getting balance");
            expect(error.statusCode).toBe(500);
           }   catch (error) {
                console.error('Error while getting balance', error);
            }
   
    });

    it('should return the account balance successfully if the request is successful', async () => {
        const mockMerchant = { EasyPaisaDisburseAccountId: "12345" };
        easyPaisaDisburse.getDisburseAccount.mockResolvedValue({ clientId: "test" });

        // Mock the service to return the mockMerchant
        merchantService.findOne.mockResolvedValue(mockMerchant);

        // Mocking a valid transaction
        prisma.disbursement.findFirst.mockResolvedValue({ transaction_id: "transaction123" });

        // Mocking the axios response to be successful
        axios.request.mockResolvedValue({ data: { ResponseCode: "0", balance: 100 } });
        try {
            await easyPaisaService.transactionInquiry({ transactionId: "123" }, "validMerchantId");
            expect(result.balance).toBe(100);
           }   catch (error) {
                console.error('Error', error);
            }
   
    });
    
});
