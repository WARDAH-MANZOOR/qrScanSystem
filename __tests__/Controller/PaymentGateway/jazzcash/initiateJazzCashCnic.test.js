import JazzCashController from "../../../../dist/controller/paymentGateway/jazzCash.js";
import jazzCashService from "../../../../dist/services/paymentGateway/jazzCash.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import { validationResult } from "express-validator";
import { body } from 'express-validator';

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
  
  beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });

describe("initiateJazzCashCnic", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: { amount: 1000, cnic: "42201-1234567-9" },
            params: { merchantId: "123" },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should return 400 if validation fails", async () => {
        const mockErrors = {
            isEmpty: jest.fn().mockReturnValue(false),
            array: jest.fn().mockReturnValue([{ msg: "Amount is required" }]),
        };
        validationResult.mockReturnValue(mockErrors);

        await JazzCashController.initiateJazzCashCnic(req, res, next);

        expect(validationResult).toHaveBeenCalledWith(req);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error({ msg: "Amount is required" }));
        expect(jazzCashService.initiateJazzCashCnicPayment).not.toHaveBeenCalled();
    });

    it("should return 400 if merchantId is missing", async () => {
        req.params = {}; // No merchantId

        validationResult.mockReturnValue({ isEmpty: jest.fn().mockReturnValue(true) });

        await JazzCashController.initiateJazzCashCnic(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant ID is required"));
        expect(jazzCashService.initiateJazzCashCnicPayment).not.toHaveBeenCalled();
    });

    it("should return success response with 200 when payment is initiated successfully", async () => {
        const mockResult = { statusCode: "000", transactionId: "txn_001" };
        
        validationResult.mockReturnValue({ isEmpty: jest.fn().mockReturnValue(true) });
        jazzCashService.initiateJazzCashCnicPayment.mockResolvedValue(mockResult);

        await JazzCashController.initiateJazzCashCnic(req, res, next);

        expect(validationResult).toHaveBeenCalledWith(req);
        expect(jazzCashService.initiateJazzCashCnicPayment).toHaveBeenCalledWith(req.body, "123");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult));
    });

    it("should return error response if statusCode is not '000'", async () => {
        const mockResult = { statusCode: "404", message: "Payment Failed" };

        validationResult.mockReturnValue({ isEmpty: jest.fn().mockReturnValue(true) });
        jazzCashService.initiateJazzCashCnicPayment.mockResolvedValue(mockResult);

        await JazzCashController.initiateJazzCashCnic(req, res, next);

        expect(jazzCashService.initiateJazzCashCnicPayment).toHaveBeenCalledWith(req.body, "123");
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith(ApiResponse.error(mockResult, 404));
    });

    it("should return status 201 if statusCode is 500", async () => {
        const mockResult = { statusCode: "500", message: "Server Error" };

        validationResult.mockReturnValue({ isEmpty: jest.fn().mockReturnValue(true) });
        jazzCashService.initiateJazzCashCnicPayment.mockResolvedValue(mockResult);

        await JazzCashController.initiateJazzCashCnic(req, res, next);

        expect(jazzCashService.initiateJazzCashCnicPayment).toHaveBeenCalledWith(req.body, "123");
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(ApiResponse.error(mockResult, 201));
    });

    it("should call next with error if service fails", async () => {
        const mockError = new Error("Service error");

        validationResult.mockReturnValue({ isEmpty: jest.fn().mockReturnValue(true) });
        jazzCashService.initiateJazzCashCnicPayment.mockRejectedValue(mockError);

        await JazzCashController.initiateJazzCashCnic(req, res, next);

        expect(jazzCashService.initiateJazzCashCnicPayment).toHaveBeenCalledWith(req.body, "123");
        expect(next).toHaveBeenCalledWith(mockError);
    });
});
