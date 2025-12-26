import { validationResult } from "express-validator";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
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
describe("initiateSwichController", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {
                merchantId: "testMerchantId",
            },
            body: {
                amount: 100,
                phone: "1234567890",
                email: "test@example.com",
                order_id: "testOrderId",
                type: "testType",
            },
        };

        res = {
            status: jest.fn().mockReturnThis(), // Chainable status method
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

        await SwichController.initiateSwichController(req, res, next);

        // Ensure the response is an error due to validation failure
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Validation Error"));
    });

    it("should return an error if merchantId is not provided", async () => {
        req.params.merchantId = undefined;

        await SwichController.initiateSwichController(req, res, next);

        // Ensure the response is an error due to missing merchantId
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant ID is required"));
    });

    it("should successfully initiate Swich and return success response", async () => {
        const mockResult = { statusCode: "pending", data: "mockData" };

        // Mock the service response
        swichService.initiateSwich.mockResolvedValueOnce(mockResult);

        await SwichController.initiateSwichController(req, res, next);

        // Ensure the service was called with the correct parameters
        expect(swichService.initiateSwich).toHaveBeenCalledWith(req.body, req.params.merchantId);

        // Ensure the response is successful
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult));
    });

    it("should call next with an error if there is an unexpected error", async () => {
        const mockError = new Error("Unexpected error");

        // Mock initiateSwich to throw an error
        swichService.initiateSwich.mockRejectedValueOnce(mockError);

        await SwichController.initiateSwichController(req, res, next);

        // Ensure next is called with the error
        expect(next).toHaveBeenCalledWith(mockError);
    });
});
