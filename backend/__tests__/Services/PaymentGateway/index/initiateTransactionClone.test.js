import { initiateTransactionClone } from '../../../../dist/services/paymentGateway/index.js';
import CustomError from "../../../../dist/utils/custom_error.js";
import prisma from "../../../../dist/prisma/client.js";
import jazzcashDisburse from '../../../../dist/services/paymentGateway/jazzcashDisburse.js';
import { transactionService, merchantService, easyPaisaService } from "../../../../dist/services/index.js";
import { mockResponse } from 'jest-mock-req-res';

jest.mock('../../../../dist/prisma/client.js', () => ({
    findOne: jest.fn(),
    disbursement: {
        findFirst: jest.fn()
    }
}));

jest.mock("../../../../dist/services/paymentGateway/jazzcashDisburse.js", () => ({
    getDisburseAccount: jest.fn(),
}));

jest.mock("../../../../dist/services/index.js", () => ({
    merchantService: {
        findOne: jest.fn().mockResolvedValue(null),
    },
    transactionService: {
        createTransactionId: jest.fn(),
        sendCallback: jest.fn()
    },
    easyPaisaService: {
        adjustMerchantToDisburseBalance: jest.fn()
    }
}));
jest.mock("../../../../dist/services/paymentGateway/index.js", () => ({
    initiateTransactionClone: jest.fn(),
}));
beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console errors
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console logs
});

afterEach(() => {
    console.error.mockRestore();
});

describe("initiateTransactionClone", () => {
    it("should throw an error if merchant is not found", async () => {
        merchantService.findOne.mockResolvedValue(null);
        initiateTransactionClone.mockImplementation(() => {
            throw new CustomError("Merchant not found", 404);
        });
        
        try {
            await initiateTransactionClone("token", { amount: 1000 }, "merchantId");
        } catch (error) {
            expect(error.message).toBe("Merchant not found");
            expect(error.statusCode).toBe(404);
        }
    });
    
    it("should throw an error if merchant does not have a disbursement account", async () => {
        merchantService.findOne.mockResolvedValue({ merchant_id: 1, JazzCashDisburseAccountId: null });
        initiateTransactionClone.mockImplementation(() => {
            throw new CustomError("Disbursement account not assigned.", 404);
        });
        try {
            await initiateTransactionClone("token", { amount: 1000 }, "merchantId");
        } catch (error) {
            expect(error.message).toBe("Disbursement account not assigned.");
            expect(error.statusCode).toBe(404);
        }
    });

    it("should throw an error if disbursement account is not found", async () => {
        merchantService.findOne.mockResolvedValue({ merchant_id: 1, JazzCashDisburseAccountId: "12345" });
        jazzcashDisburse.getDisburseAccount.mockResolvedValue(null);
        initiateTransactionClone.mockImplementation(() => {
            throw new CustomError("Disbursement account not found", 404);
        });
        try {
            await initiateTransactionClone("token", { amount: 1000 }, "merchantId");
        } catch (error) {
            expect(error.message).toBe("Disbursement account not found");
            expect(error.statusCode).toBe(404);
        }
    });

    it("should throw an error if order ID already exists", async () => {
        merchantService.findOne.mockResolvedValue({ merchant_id: 1, JazzCashDisburseAccountId: "12345" });
        jazzcashDisburse.getDisburseAccount.mockResolvedValue({ data: { key: "test-key", initialVector: "test-iv" } });
        prisma.disbursement.findFirst.mockResolvedValue({ id: 1 });
        initiateTransactionClone.mockImplementation(() => {
            throw new CustomError("Order ID already exists", 400);
        });
        try {
            await initiateTransactionClone("token", { amount: 1000, order_id: "existing_order" }, "merchantId");
        } catch (error) {
            expect(error.message).toBe("Order ID already exists");
            expect(error.statusCode).toBe(400);
        }
    });

    it("should throw an error if merchant has insufficient balance", async () => {
        merchantService.findOne.mockResolvedValue({ merchant_id: 1, JazzCashDisburseAccountId: "12345", balanceToDisburse: 500 });
        jazzcashDisburse.getDisburseAccount.mockResolvedValue({ data: { key: "test-key", initialVector: "test-iv" } });
        prisma.disbursement.findFirst.mockResolvedValue(null);
        initiateTransactionClone.mockImplementation(() => {
            throw new CustomError("Insufficient balance to disburse", 400);
        });
        try {
            await initiateTransactionClone("token", { amount: 1000 }, "merchantId");
        } catch (error) {
            expect(error.message).toBe("Insufficient balance to disburse");
            expect(error.statusCode).toBe(400);
        }
   
    });

        
    it("should successfully initiate transaction if all conditions are met", async () => {
        const mockResponse = { 
            success: true,
            merchant_id: 1, 
            JazzCashDisburseAccountId: "12345", 
            balanceToDisburse: 2000
        };

        initiateTransactionClone.mockResolvedValue(mockResponse);

        const result = await initiateTransactionClone("token", { amount: 1000 }, "merchantId");
        expect(result).toEqual(mockResponse);
    });
        
  
    
});
