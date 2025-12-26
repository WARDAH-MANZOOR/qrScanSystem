import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import { swichService } from "../../../../dist/services/index.js";
import SwichController from "../../../../dist/controller/paymentGateway/swich.js";
import { validationResult } from "express-validator";

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

describe("deleteSwichMerchant", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                merchantId: "merchantId123",
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

        await SwichController.deleteSwichMerchant(req, res, next);

        // Ensure the response is an error due to validation failure
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Validation Error"));
    });

    it("should successfully delete a merchant and return success message", async () => {
        const mockDeletedMerchant = { id: "merchantId123", name: "Merchant to Delete" };

        // Mock the service response to simulate successful deletion
        swichService.deleteMerchant.mockResolvedValueOnce(mockDeletedMerchant);

        await SwichController.deleteSwichMerchant(req, res, next);

        // Ensure the service was called with the correct parameters
        expect(swichService.deleteMerchant).toHaveBeenCalledWith(req.params.merchantId);

        // Ensure the response is successful and the correct status and message are returned
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success({ message: "Merchant deleted successfully" }));
    });

    it("should return a 404 error if merchant is not found", async () => {
        // Mock the service response to return null, indicating merchant not found
        swichService.deleteMerchant.mockResolvedValueOnce(null);

        await SwichController.deleteSwichMerchant(req, res, next);

        // Ensure the response is a 404 error with the appropriate message
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant not found"));
    });

    it("should call next with an error if there is an unexpected error", async () => {
        const mockError = new Error("Unexpected error");

        // Mock deleteMerchant to throw an error
        swichService.deleteMerchant.mockRejectedValueOnce(mockError);

        await SwichController.deleteSwichMerchant(req, res, next);

        // Ensure next is called with the error
        expect(next).toHaveBeenCalledWith(mockError);
    });
});
