import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import { validationResult } from "express-validator";

import { swichService } from "../../../../dist/services/index.js";
import SwichController from "../../../../dist/controller/paymentGateway/swich.js";

// Mocking external services
jest.mock('../../../../dist/services/index.js');
jest.mock('../../../../dist/utils/ApiResponse.js');
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

describe("updateSwichMerchant", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                merchantId: "merchantId123",
            },
            body: {
                name: "Updated Merchant",
                email: "updatedmerchant@example.com",
                phone: "0987654321",
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };

        next = jest.fn();

        jest.clearAllMocks(); // Reset all mocks before each test
    });

    it("should return an error if validation errors occur", async () => {
        // Mock validation errors
        validationResult.mockReturnValueOnce({
            isEmpty: jest.fn().mockReturnValueOnce(false),
            array: jest.fn().mockReturnValueOnce([{ msg: "Validation Error" }]),
        });

        await SwichController.updateSwichMerchant(req, res, next);

        // Ensure the response is an error due to validation failure
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Validation Error"));
    });

    it("should successfully update a merchant and return success response", async () => {
        const mockUpdatedMerchant = { id: "merchantId123", name: "Updated Merchant" };

        // Mock the service response
        swichService.updateMerchant.mockResolvedValueOnce(mockUpdatedMerchant);

        await SwichController.updateSwichMerchant(req, res, next);

        // Ensure the service was called with the correct parameters
        expect(swichService.updateMerchant).toHaveBeenCalledWith(req.params.merchantId, req.body);

        // Ensure the response is successful and the correct status and data are returned
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockUpdatedMerchant));
    });

    it("should return a 404 error if merchant is not found", async () => {
        // Mock the service response to return null, indicating merchant not found
        swichService.updateMerchant.mockResolvedValueOnce(null);

        await SwichController.updateSwichMerchant(req, res, next);

        // Ensure the response is a 404 error with the appropriate message
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant not found"));
    });

    it("should call next with an error if there is an unexpected error", async () => {
        const mockError = new Error("Unexpected error");

        // Mock updateMerchant to throw an error
        swichService.updateMerchant.mockRejectedValueOnce(mockError);

        await SwichController.updateSwichMerchant(req, res, next);

        // Ensure next is called with the error
        expect(next).toHaveBeenCalledWith(mockError);
    });
});
