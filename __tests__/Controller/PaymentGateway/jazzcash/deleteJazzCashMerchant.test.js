import jazzCashService from "../../../../dist/services/paymentGateway/jazzCash.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import { validationResult } from "express-validator";
import JazzCashController from "../../../../dist/controller/paymentGateway/jazzCash.js";

jest.mock("../../../../dist/services/paymentGateway/jazzCash.js");

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

describe('deleteJazzCashMerchant Controller', () => {

  it('should return status 400 if merchantId is not provided', async () => {
      // Mock the req and res objects
      const req = {
          params: { merchantId: undefined },
      };
      const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };
      const next = jest.fn();

      // Call the controller method
      await JazzCashController.deleteJazzCashMerchant(req, res, next);

      // Check if Merchant ID error is handled properly
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant ID is required"));
      expect(next).not.toHaveBeenCalled();
  });

  it('should delete merchant and return success response', async () => {
    // Mock the successful merchant deletion response
    const deletedMerchant = { success: true };
    jazzCashService.deleteJazzCashMerchant.mockResolvedValue(deletedMerchant);

    // Mock the req and res objects
    const req = {
        params: { merchantId: '1' },
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };
    const next = jest.fn();

    // Call the controller method
    await JazzCashController.deleteJazzCashMerchant(req, res, next);

    // Check if the success response is returned
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(ApiResponse.success(deletedMerchant));
    expect(next).not.toHaveBeenCalled();
});


  it('should handle server errors gracefully', async () => {
      // Mock the error thrown by the service
      const mockError = new Error('Server error');
      jazzCashService.deleteJazzCashMerchant.mockRejectedValue(mockError);

      // Mock the req and res objects
      const req = {
          params: { merchantId: '1' },
      };
      const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
      };
      const next = jest.fn();

      // Call the controller method
      await JazzCashController.deleteJazzCashMerchant(req, res, next);

      // Check if the error is passed to next middleware
      expect(next).toHaveBeenCalledWith(mockError);
  });

});
