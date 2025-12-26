import prisma from "../../../../dist/prisma/client.js";
import CustomError from "../../../../dist/utils/custom_error.js";
import { hashPassword } from "../../../../dist/services/authentication/index.js";
import merchantService from "../../../../dist/services/merchant/index.js";

jest.mock("../../../../dist/prisma/client.js", () => ({
    $transaction: jest.fn(),
}));

jest.mock("../../../../dist/utils/custom_error.js", () => {
    return jest.fn().mockImplementation((message, statusCode) => {
        const error = new Error(message);
        error.statusCode = statusCode;
        return error;
    });
});

jest.mock("../../../../dist/services/authentication/index.js", () => ({
    hashPassword: jest.fn(),
}));

describe("updateMerchant", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
        jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
    });

    it("should successfully update merchant with a password update", async () => {
        const payload = {
            username: "testUser",
            email: "test@example.com",
            password: "newPassword123", // Ensure the password is included
            phone_number: "1234567890",
            company_name: "Test Company",
            company_url: "https://test.com",
            city: "Test City",
            payment_volume: 1000,
            commission: 5,
            merchantId: 1,
            commissionGST: 2,
            commissionWithHoldingTax: 1,
            disbursementGST: 2,
            disbursementRate: 5,
            disbursementWithHoldingTax: 1,
            settlementDuration: 10,
            jazzCashMerchantId: "1234",
            easyPaisaMerchantId: "5678",
            swichMerchantId: "91011",
            webhook_url: "https://webhook.com",
            EasyPaisaDisburseAccountId: "EASYPAY123",
            easypaisaPaymentMethod: "direct",
            easypaisaInquiryMethod: "direct",
            JazzCashDisburseAccountId: "JAZZ123",
            encrypted: "true",
            callback_mode: "SINGLE",
            payout_callback: "https://payout.com"
        };

        // Mocking prisma.$transaction
        prisma.$transaction.mockImplementation(async (callback) => {
            const mockTx = {
                user: {
                    update: jest.fn().mockResolvedValue({}),
                },
                merchant: {
                    update: jest.fn().mockResolvedValue({}),
                },
                merchantFinancialTerms: {
                    findUnique: jest.fn().mockResolvedValue({ settlementDuration: 10 }),
                    update: jest.fn().mockResolvedValue({}),
                },
            };
            return await callback(mockTx);
        });

        // Mocking hashPassword
        hashPassword.mockResolvedValue("mockedHash");

        const result = await merchantService.updateMerchant(payload);

        // Assertions
        expect(result).toBe("Merchant updated successfully");
        expect(hashPassword).toHaveBeenCalledWith("newPassword123");
        expect(prisma.$transaction).toHaveBeenCalled();
    });


    // Test Case 2: Successful Merchant Update Without Password
    it("should successfully update merchant without updating the password", async () => {
        const payload = {
            username: "testUser",
            email: "test@example.com",
            phone_number: "1234567890",
            company_name: "Test Company",
            company_url: "https://test.com",
            city: "Test City",
            payment_volume: 1000,
            commission: 5,
            merchantId: 1,
            commissionGST: 2,
            commissionWithHoldingTax: 1,
            disbursementGST: 2,
            disbursementRate: 5,
            disbursementWithHoldingTax: 1,
            settlementDuration: 10,
            jazzCashMerchantId: "1234",
            easyPaisaMerchantId: "5678",
            swichMerchantId: "91011",
            webhook_url: "https://webhook.com",
            EasyPaisaDisburseAccountId: "EASYPAY123",
            easypaisaPaymentMethod: "direct",
            easypaisaInquiryMethod: "direct",
            JazzCashDisburseAccountId: "JAZZ123",
            encrypted: "true",
            callback_mode: "SINGLE",
            payout_callback: "https://payout.com"
        };

        prisma.$transaction.mockResolvedValue("Merchant updated successfully");

        const result = await merchantService.updateMerchant(payload);

        expect(result).toBe("Merchant updated successfully");
        expect(prisma.$transaction).toHaveBeenCalled();
    });
 

    // Test Case 5: Successful Merchant Update with Single Callback Mode
    it("should update merchant with SINGLE callback mode correctly", async () => {
        const payload = {
            username: "testUser",
            email: "test@example.com",
            phone_number: "1234567890",
            company_name: "Test Company",
            company_url: "https://test.com",
            city: "Test City",
            payment_volume: 1000,
            commission: 5,
            merchantId: 1,
            commissionGST: 2,
            commissionWithHoldingTax: 1,
            disbursementGST: 2,
            disbursementRate: 5,
            disbursementWithHoldingTax: 1,
            settlementDuration: 10,
            jazzCashMerchantId: "1234",
            easyPaisaMerchantId: "5678",
            swichMerchantId: "91011",
            webhook_url: "https://webhook.com",
            EasyPaisaDisburseAccountId: "EASYPAY123",
            easypaisaPaymentMethod: "direct",
            easypaisaInquiryMethod: "direct",
            JazzCashDisburseAccountId: "JAZZ123",
            encrypted: "true",
            callback_mode: "SINGLE",
            payout_callback: "https://payout.com"
        };

        prisma.$transaction.mockResolvedValue("Merchant updated successfully");

        const result = await merchantService.updateMerchant(payload);

        expect(result).toBe("Merchant updated successfully");
        expect(prisma.$transaction).toHaveBeenCalled();
    });
    it("should throw an error for invalid EasyPaisa payment method", async () => {
        const payload = {
            username: "merchantUser",
            email: "merchant@example.com",
            password: "password123",
            phone_number: "1234567890",
            company_name: "Merchant Company",
            company_url: "https://merchant.com",
            city: "City",
            payment_volume: 1000,
            commission: 10,
            merchantId: 1,
            commissionGST: 5,
            commissionWithHoldingTax: 2,
            disbursementGST: 3,
            disbursementRate: 2,
            disbursementWithHoldingTax: 1,
            settlementDuration: 30,
            jazzCashMerchantId: "jazz123",
            easyPaisaMerchantId: "easypaisa123",
            swichMerchantId: "switch123",
            webhook_url: "https://merchant.com/webhook",
            EasyPaisaDisburseAccountId: "easypaisaAccount",
            easypaisaPaymentMethod: "INVALID_METHOD", // Invalid payment method
            easypaisaInquiryMethod: "InquiryMethod",
            JazzCashDisburseAccountId: "jazzCashAccount",
            encrypted: false,
            callback_mode: "MULTIPLE",
            payout_callback: "https://merchant.com/payout_callback"
        };

        try {
            await merchantService.updateMerchant(payload);
        } catch (error) {
            expect(error.message).toBe("Easy Paisa Method not valid");
            expect(error.statusCode).toBe(400);
        }
    });
    
    
    it("should throw an internal server error when there is an issue with database", async () => {
        const payload = {
            username: "testUser",
            email: "test@example.com",
            merchantId: 1,
        };
    
        prisma.$transaction.mockImplementationOnce(() => {
            throw new Error("Database error");
        });
    
        await expect(merchantService.updateMerchant(payload)).rejects.toThrowError(
            new CustomError("Internal Server Error", 500)
        );
    });
    
    
});
