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

describe("swichTxInquiry", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            query: {
                transactionId: "tx12345",
            },
            params: {
                merchantId: "merchantId123",
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
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

        await SwichController.swichTxInquiry(req, res, next);

        // Ensure the response is an error due to validation failure
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Validation Error"));
    });

    it("should return an error if transactionId is missing", async () => {
        req.query.transactionId = undefined; // Simulating missing transactionId

        await SwichController.swichTxInquiry(req, res, next);

        // Ensure the response is an error due to missing transactionId
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Transaction ID is required"));
    });

    it("should return an error if merchantId is missing", async () => {
        req.params.merchantId = undefined; // Simulating missing merchantId

        await SwichController.swichTxInquiry(req, res, next);

        // Ensure the response is an error due to missing merchantId
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant ID is required"));
    });

    it("should successfully return transaction data", async () => {
        const mockTransaction = { transactionId: "tx12345", status: "success", amount: 100 };

        // Mock the service response to simulate a successful transaction inquiry
        swichService.swichTxInquiry.mockResolvedValueOnce(mockTransaction);

        await SwichController.swichTxInquiry(req, res, next);

        // Ensure the service was called with correct parameters
        expect(swichService.swichTxInquiry).toHaveBeenCalledWith(req.query.transactionId, req.params.merchantId);

        // Ensure the response contains the correct transaction data
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockTransaction));
    });

    it("should call next with an error if there is an unexpected error", async () => {
        const mockError = new Error("Unexpected error");

        // Mock swichTxInquiry to throw an error
        swichService.swichTxInquiry.mockRejectedValueOnce(mockError);

        await SwichController.swichTxInquiry(req, res, next);

        // Ensure next is called with the error
        expect(next).toHaveBeenCalledWith(mockError);
    });
});
