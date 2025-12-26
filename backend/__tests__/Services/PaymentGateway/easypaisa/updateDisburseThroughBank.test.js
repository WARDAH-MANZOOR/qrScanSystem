import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import { merchantService, easyPaisaDisburse } from "../../../../dist/services/index.js";
import { CustomError } from "../../../../dist/utils/custom_error.js";
import axios from "axios";
import prisma from "../../../../dist/prisma/client.js";
import { Decimal } from "@prisma/client/runtime/library";

// Mock banks.json data
jest.mock(
  "data/banks.json",
  () => [
    { BankName: "Bank A", BankTitle: "Bank A Title", BankShortName: "BA" },
    { BankName: "Bank B", BankTitle: "Bank B Title", BankShortName: "BB" },
  ],
  { virtual: true }
);

jest.mock("axios", () => ({
  request: jest.fn(),
}));

jest.mock("../../../../dist/prisma/client.js", () => ({
    disbursement: { // Ensure this is correctly mocked
        findFirst: jest.fn(),
      },
      transaction: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
}));

jest.mock("../../../../dist/services/index.js", () => ({
  merchantService: {
    findOne: jest.fn(),
  },
  easyPaisaDisburse: {
    getDisburseAccount: jest.fn(),
  },
  
}));

  
beforeEach(() => {
  jest.clearAllMocks(); // Reset mock state before each test
  jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
  jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

afterEach(() => {
  console.error.mockRestore(); // Restore console.error after tests
});
describe("updateDisburseThroughBank", () => {
    let mockMerchant, mockDisbursementAccount, mockOrder;

    beforeEach(() => {
        mockMerchant = {
            uid: "merchant123",
            merchant_id: "123456",
            balanceToDisburse: 10000,
            EasyPaisaDisburseAccountId: "disburse123",
            callback_mode: "DOUBLE",
            payout_callback: "https://callback.url",
            webhook_url: "https://webhook.url",
            encrypted: false,
        };
        mockDisbursementAccount = {
            MSISDN: "923001234567",
            clientId: "client123",
            clientSecret: "secret123",
            xChannel: "channel123",
        };
        mockOrder = null;
    });
    it("should throw an error if merchant is not found", async () => {
            merchantService.findOne.mockResolvedValue(null);
            try{
        
            await easyPaisaService.updateDisburseThroughBank({}, "merchant123")
        
            } catch(error){
            console.error("Merchant not found", error)
            }
        });
    it("should throw an error if disbursement account is not assigned", async () => {
        merchantService.findOne.mockResolvedValue({ ...mockMerchant, EasyPaisaDisburseAccountId: null });
        
            try{
        
              await easyPaisaService.updateDisburseThroughBank({}, "merchant123")
        
            } catch(error){
              console.error("Disbursement account not assigned.", error)
            }
          });


    it("should throw an error if disbursement account is not found", async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        easyPaisaDisburse.getDisburseAccount.mockResolvedValue(null);
            try{
        
            await easyPaisaService.updateDisburseThroughBank({}, "merchant123")
        
            } catch(error){
            console.error("Disbursement account not found", error)
            }
        });
    it('should throw error if order ID already exists', async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        easyPaisaDisburse.getDisburseAccount.mockResolvedValue({ data: mockDisbursementAccount });
        prisma.disbursement.findFirst.mockResolvedValue({ id: 1 });
        
        try {
            await easyPaisaService.updateDisburseThroughBank({ order_id: "order123" }, "merchant123")
            expect(error.message).to.equal('Order ID already exists');
            expect(error.statusCode).to.equal(400);
        } catch (error) {
            console.error("Order ID already exists", error)

        }
    });
    it("should throw an error if bank is not found", async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        easyPaisaDisburse.getDisburseAccount.mockResolvedValue({ data: mockDisbursementAccount });
        prisma.disbursement.findFirst.mockResolvedValue(null);
        try{
        await easyPaisaService.updateDisburseThroughBank({ to_provider: "Unknown Bank" }, "merchant123")
        } catch(error){
        console.error("Bank not found", error)
        }
    });
    it('should throw error if merchant has insufficient balance', async () => {
        merchantService.findOne.mockResolvedValue({ ...mockMerchant, balanceToDisburse: 500 });
        easyPaisaDisburse.getDisburseAccount.mockResolvedValue({ data: mockDisbursementAccount });
        prisma.disbursement.findFirst.mockResolvedValue(null);
                    
        try {
            await easyPaisaService.updateDisburseThroughBank({ merchantAmount: 1000, commission: 100, gst: 50, withholdingTax: 20 }, "merchant123")
            expect(error).toBeInstanceOf(error);
            expect(error.message).toBe('Insufficient balance to disburse');
            expect(error.statusCode).to.equal(400);
        
        } catch (error) {
            console.error("Insufficient balance to disburse", error)

        }
        });
    test("should return success message on valid request", async () => {
        merchantService.findOne.mockResolvedValue(mockMerchant);
        easyPaisaDisburse.getDisburseAccount.mockResolvedValue({ data: mockDisbursementAccount });
        prisma.disbursement.findFirst.mockResolvedValue(null);
        axios.request.mockResolvedValue({ data: { ResponseCode: "0", TransactionStatus: "Success" } });
        try {
        const result = await easyPaisaService.updateDisburseThroughBank({
            order_id: "order123",
            merchantAmount: 500,
            commission: 50,
            gst: 20,
            withholdingTax: 10,
            to_provider: "HBL",
            account: "1234567890",
        }, "merchant123");

        expect(result).toEqual(expect.objectContaining({
            message: "Disbursement created successfully",
        }));
    } catch (error) {
        console.error("Insufficient balance to disburse", error)

    }
    });
});
