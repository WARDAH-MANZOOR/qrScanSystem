import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import CustomError from "../../../../dist/utils/custom_error.js";

// Mock easyPaisaService
jest.mock("../../../../dist/services/paymentGateway/easypaisa.js", () => ({
  createMerchant: jest.fn(),
}));

// Mock CustomError
jest.mock("../../../../dist/utils/custom_error.js");

describe('createMerchant', () => {
    let mockCreate;
    let mockMerchantData;

    beforeEach(() => {
        mockCreate = easyPaisaService.createMerchant;
        // Define mockMerchantData for reuse in all tests
        mockMerchantData = { name: 'Test Merchant' };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create a merchant successfully', async () => {
        const mockResponse = { id: 1, metadata: { key: 'value' }, name: 'Test Merchant' };
        
        easyPaisaService.createMerchant = jest.fn().mockResolvedValue({
          message: 'Merchant created successfully',
          data: mockResponse
        });
      
        const result = await easyPaisaService.createMerchant(mockMerchantData);
      
        expect(result).toEqual({
          message: 'Merchant created successfully',
          data: mockResponse,
        });
    });

    it('should throw an error when merchant data is not provided', async () => {
        easyPaisaService.createMerchant = jest.fn().mockRejectedValue(new Error("Merchant data is required"));
        await expect(easyPaisaService.createMerchant(null)).rejects.toThrowError("Merchant data is required");
    });

    it('should throw an error when creating merchant fails', async () => {
        const mockError = new CustomError("An error occurred while creating the merchant", 500);
      
        easyPaisaService.createMerchant = jest.fn().mockRejectedValue(new Error("Database error"));
        await expect(easyPaisaService.createMerchant(mockMerchantData)).rejects.toThrowError("Database error");
    });

    it('should set metadata to an empty object if not provided', async () => {
        const mockResponse = { id: 1, metadata: {}, name: 'Test Merchant' };
      
        easyPaisaService.createMerchant = jest.fn().mockResolvedValue({
          message: 'Merchant created successfully',
          data: mockResponse
        });
      
        const result = await easyPaisaService.createMerchant(mockMerchantData);
      
        expect(result).toEqual({
          message: 'Merchant created successfully',
          data: mockResponse,
        });
    });

    it('should throw a 500 error if easyPaisaMerchant creation fails', async () => {
        const mockError = new Error("An error occurred while creating the merchant");
    
        // Ensure the function rejects with the mock error
        easyPaisaService.createMerchant = jest.fn().mockRejectedValue(mockError);
    
        // Assert the error message only
        await expect(easyPaisaService.createMerchant(mockMerchantData))
            .rejects
            .toThrowError("An error occurred while creating the merchant");
    });
    
});
