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
describe("createSwichMerchant", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                name: "Test Merchant",
                email: "merchant@example.com",
                phone: "1234567890",
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

        await SwichController.createSwichMerchant(req, res, next);

        // Ensure the response is an error due to validation failure
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Validation Error"));
    });

    it("should successfully create a new merchant and return success response", async () => {
        const mockNewMerchant = { id: "newMerchantId", name: "Test Merchant" };

        // Mock the service response
        swichService.createMerchant.mockResolvedValueOnce(mockNewMerchant);

        await SwichController.createSwichMerchant(req, res, next);

        // Ensure the service was called with the correct parameters
        expect(swichService.createMerchant).toHaveBeenCalledWith(req.body);

        // Ensure the response is successful and the correct status and data are returned
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockNewMerchant));
    });

    it("should call next with an error if there is an unexpected error", async () => {
        const mockError = new Error("Unexpected error");

        // Mock createMerchant to throw an error
        swichService.createMerchant.mockRejectedValueOnce(mockError);

        await SwichController.createSwichMerchant(req, res, next);

        // Ensure next is called with the error
        expect(next).toHaveBeenCalledWith(mockError);
    });
});
