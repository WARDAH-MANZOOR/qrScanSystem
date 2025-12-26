import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import CustomError from "../../../../dist/utils/custom_error.js";

// Mock prisma and easyPaisaService
jest.mock("../../../../dist/services/paymentGateway/easypaisa.js", () => ({
    getMerchant: jest.fn(),
}));

jest.mock("../../../../dist/utils/custom_error.js");

describe('getMerchant', () => {
    let mockMerchantId;

    beforeEach(() => {
        mockMerchantId = 1;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should retrieve a merchant successfully with a valid merchantId', async () => {
        const mockMerchantData = [
            { id: 1, name: 'Test Merchant', metadata: { key: 'value' } }
        ];

        easyPaisaService.getMerchant.mockResolvedValue({
            message: 'Merchant retrieved successfully',
            data: mockMerchantData,
        });

        const result = await easyPaisaService.getMerchant(mockMerchantId);

        expect(result).toEqual({
            message: 'Merchant retrieved successfully',
            data: mockMerchantData,
        });
    });

    it('should retrieve all merchants when no merchantId is provided', async () => {
        const mockMerchantData = [
            { id: 1, name: 'Test Merchant 1', metadata: { key: 'value' } },
            { id: 2, name: 'Test Merchant 2', metadata: { key: 'value' } }
        ];

        easyPaisaService.getMerchant.mockResolvedValue({
            message: 'Merchant retrieved successfully',
            data: mockMerchantData,
        });

        const result = await easyPaisaService.getMerchant();

        expect(result).toEqual({
            message: 'Merchant retrieved successfully',
            data: mockMerchantData,
        });
    });

    it("should throw a 404 error if no merchant is found", async () => {
        // Mock rejection with CustomError when no merchant is found
        easyPaisaService.getMerchant=jest.fn().mockRejectedValueOnce(
            new Error("Merchant not found")
        );
    
        await expect(easyPaisaService.getMerchant(mockMerchantId))
            .rejects
            .toThrowError(("Merchant not found"));
    });

    it('should throw a 500 error if an unexpected error occurs', async () => {
        // Mock unexpected error
        const mockError = new Error("Database connection failed");
        easyPaisaService.getMerchant = jest.fn().mockRejectedValue(mockError);


        await expect(easyPaisaService.getMerchant(mockMerchantId))
            .rejects
            .toThrowError(("Database connection failed"));
    });


    it('should throw a 500 error if an error occurs without a specific message', async () => {
        const mockError = new Error();

        easyPaisaService.getMerchant.mockRejectedValue(mockError);

        await expect(easyPaisaService.getMerchant(mockMerchantId))
            .rejects
            .toThrowError(new CustomError("An error occurred while reading the merchant", 500));
    });
});
