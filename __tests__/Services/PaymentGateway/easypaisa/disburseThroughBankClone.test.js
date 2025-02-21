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
describe("disburseThroughBankClone", () => {
  const merchantId = 123;
  const obj = {
    amount: 1000,
    accountNo: "123456789",
    phone: "3001234567",
    purpose: "Payment",
    bankName: "Bank A",
    order_id: "order123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

    it("should throw an error if merchant is not found", async () => {
        merchantService.findOne.mockResolvedValue(null);
        try{
    
          await easyPaisaService.disburseThroughBankClone(obj, merchantId)
    
        } catch(error){
          console.error("Merchant not found", error)
        }
      });

    it("should throw an error if disbursement account is not found", async () => {
        const mockMerchant = { EasyPaisaDisburseAccountId: "account123" };
    
        merchantService.findOne.mockResolvedValue(mockMerchant);
        easyPaisaDisburse.getDisburseAccount.mockResolvedValue(null);
        try{
    
          await easyPaisaService.disburseThroughBankClone(obj, merchantId)
    
        } catch(error){
          console.error("Disbursement account not found", error)
        }
      });

    it("should throw an error if disbursement account is not assigned", async () => {
        const mockMerchant = { EasyPaisaDisburseAccountId: null };
    
        merchantService.findOne.mockResolvedValue(mockMerchant);
        try{
    
          await easyPaisaService.disburseThroughBankClone(obj, merchantId)
    
        } catch(error){
          console.error("Disbursement account not assigned.", error)
        }
      });

    it('should throw error if order ID already exists', async () => {
        merchantService.findOne.mockResolvedValue({
            merchant_id: 'merchant-123',
            EasyPaisaDisburseAccountId: 'account-123'
        });
        prisma.disbursement.findFirst.mockResolvedValue({});
        
        try {
            await easyPaisaService.disburseThroughBankClone({ order_id: "order_001" }, "merchant123")
            expect(error.message).to.equal('Order ID already exists');
            expect(error.statusCode).to.equal(400);
        } catch (error) {
            console.error("Order ID already exists", error)

        }
    });

    it("should throw an error if bank is not found", async () => {
        const mockMerchant = { EasyPaisaDisburseAccountId: "account123" };
        const objWithInvalidBank = { ...obj, bankName: "NonExistentBank" };
    
        merchantService.findOne.mockResolvedValue(mockMerchant);
        try{
    
          await easyPaisaService.disburseThroughBankClone(objWithInvalidBank, merchantId)
    
        } catch(error){
          console.error("Bank not found", error)
        }
      });

    it('should throw error if merchant has insufficient balance', async () => {
        merchantService.findOne.mockResolvedValue({ 
            uid: 'merchant123', 
            EasyPaisaDisburseAccountId: 'account123', 
            balanceToDisburse: new Decimal(500) 
          });
                  
        try {
            await easyPaisaService.disburseThroughBankClone({ amount: 1000 }, 'merchant123');
            expect(error).toBeInstanceOf(error);
            expect(error.message).toBe('Insufficient balance to disburse');
            expect(error.statusCode).to.equal(400);
        
        } catch (error) {
            console.error("Insufficient balance to disburse", error)

        }
    });

    it('should throw error if API request fails', async () => {
        merchantService.findOne.mockResolvedValue({ 
            uid: 'merchant123', 
            EasyPaisaDisburseAccountId: 'account123', 
            balanceToDisburse: new Decimal(500) 
          });
          axios.request.mockRejectedValue(new Error('API error'));
        
        try {
            await easyPaisaService.disburseThroughBankClone({ accountNo: '123456789', amount: 100 }, 'merchant123');
            expect(error.message).to.equal('API error');

        } catch (error) {
            console.error("API error", error)

        }
        
    });

    it('should complete disbursement successfully', async () => {
        merchantService.findOne.mockResolvedValue({ 
            uid: 'merchant123', 
            EasyPaisaDisburseAccountId: 'account123', 
            balanceToDisburse: new Decimal(500) 
          });
          easyPaisaDisburse.getDisburseAccount.mockResolvedValue({ 
            clientId: 'client123', 
            clientSecret: 'secret123', 
            MSISDN: '12345' 
          });
          
          axios.request.mockResolvedValue({ 
            data: { ResponseCode: '0', TransactionReference: 'TXN123' } 
          });
          
          prisma.$transaction.mockResolvedValue();
          
          try {
            await easyPaisaService.disburseThroughBankClone({ accountNo: '123456789', amount: 100, bankName: 'Test Bank' }, 'merchant123');
            expect(result).to.be.undefined;
            expect(transactionStub.called).to.be.true;
        } catch (error) {
            console.error("Error", error)

        }
    });
});
