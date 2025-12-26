import { validationResult } from "express-validator";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";
import updateEasyPaisaMerchantController from "../../../../dist/controller/paymentGateway/easyPaisa.js";

jest.mock('../../../../dist/services/paymentGateway/easypaisa.js');
jest.mock('express-validator', () => ({
    body: jest.fn().mockReturnValue({
      isEmail: jest.fn().mockReturnThis(),    // Mock isEmail
      withMessage: jest.fn().mockReturnThis(), // Mock withMessage
      notEmpty: jest.fn().mockReturnThis(),    // Mock notEmpty
      normalizeEmail: jest.fn().mockReturnThis(), // Mock normalizeEmail
      isLength: jest.fn().mockReturnThis(),    // Mock isLength
    }),
    validationResult: jest.fn().mockReturnValue({
      isEmpty: jest.fn().mockReturnValue(true),  // Default to no validation errors
      array: jest.fn().mockReturnValue([]),     // Empty error array
    }),
  }));

describe('updateEasyPaisaMerchant Controller', () => {

    it('should return status 400 with validation errors', async () => {
        // Mock validationResult to return an error
        const mockValidationError = {
            isEmpty: () => false,
            array: () => [{ msg: 'Invalid input' }],
        };

        // Mock validationResult to return the mocked error
        validationResult.mockReturnValue(mockValidationError);

        // Mock the req and res objects
        const req = {
            params: { merchantId: '1' },
            body: { /* Invalid data */ },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        // Call the controller method
        await updateEasyPaisaMerchantController.updateEasyPaisaMerchant(req, res, next);

        // Check if validation error is handled properly
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error({ msg: 'Invalid input' }));
        expect(next).not.toHaveBeenCalled();
    });

    it('should return status 404 if merchant is not found', async () => {
        // Mock the service method to return null (merchant not found)
        easyPaisaService.updateMerchant.mockResolvedValue(null);
        validationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => [],
        });
        // Mock the req and res objects
        const req = {
            params: { merchantId: '1' },
            body: { name: 'Updated Merchant' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        // Call the controller method
        await updateEasyPaisaMerchantController.updateEasyPaisaMerchant(req, res, next);

        // Check if 404 response is returned
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant not found"));
        expect(next).not.toHaveBeenCalled();
    });

    it('should update merchant and return success response', async () => {
        // Mock the successful merchant update response
        const updatedMerchant = { id: 1, name: 'Updated Merchant' };
        easyPaisaService.updateMerchant.mockResolvedValue(updatedMerchant);

        // Mock the req and res objects
        const req = {
            params: { merchantId: '1' },
            body: { name: 'Updated Merchant' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        // Call the controller method
        await updateEasyPaisaMerchantController.updateEasyPaisaMerchant(req, res, next);

        // Check if the success response is returned
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(updatedMerchant));
        expect(next).not.toHaveBeenCalled();
    });

    it('should handle server errors gracefully', async () => {
        // Mock the error thrown by the service
        easyPaisaService.updateMerchant.mockRejectedValue(new Error('Server error'));

        // Mock the req and res objects
        const req = {
            params: { merchantId: '1' },
            body: { name: 'Updated Merchant' },
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();

        // Call the controller method
        await updateEasyPaisaMerchantController.updateEasyPaisaMerchant(req, res, next);

        // Check if the error is passed to next middleware
        expect(next).toHaveBeenCalledWith(new Error('Server error'));
    });
});
