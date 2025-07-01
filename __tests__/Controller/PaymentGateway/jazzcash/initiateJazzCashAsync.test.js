import { validationResult } from "express-validator";
import jazzCashService from "../../../../dist/services/paymentGateway/jazzCash.js";
import JazzCashController from "../../../../dist/controller/paymentGateway/jazzCash.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";

jest.mock('express-validator', () => ({
    body: jest.fn().mockReturnValue({
        isEmail: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis(),
        notEmpty: jest.fn().mockReturnThis(),
        normalizeEmail: jest.fn().mockReturnThis(),
        isLength: jest.fn().mockReturnThis(),
    }),
    validationResult: jest.fn().mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(true),
        array: jest.fn().mockReturnValue([]),
    }),
}));

jest.mock("../../../../dist/services/paymentGateway/jazzCash.js");

jest.mock("../../../../dist/utils/ApiResponse.js", () => ({
    error: jest.fn((message) => ({ status: "error", message })),
    success: jest.fn((data) => ({ status: "success", data })),
}));

describe("initiateJazzCashAsync", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                amount: 1000,
                currency: "PKR",
            },
            params: {
                merchantId: "12345",
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };

        next = jest.fn();
        jest.clearAllMocks();
    });

    it("should return a 400 error if validation errors are present", async () => {
        validationResult.mockReturnValueOnce({
            isEmpty: () => false,
            array: () => [{ msg: "Invalid input" }],
        });

        await JazzCashController.initiateJazzCashAsync(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error({ msg: "Invalid input" }));
    });

    it("should return a 400 error if merchantId is missing", async () => {
        validationResult.mockReturnValueOnce({ isEmpty: () => true });
        req.params.merchantId = undefined;

        await JazzCashController.initiateJazzCashAsync(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant ID is required"));
    });

    it("should return a success response if payment initiation is pending", async () => {
        validationResult.mockReturnValueOnce({ isEmpty: () => true });
        const mockResult = { statusCode: "pending", data: { transactionId: "abc123" } };

        jazzCashService.initiateJazzCashPaymentAsync.mockResolvedValueOnce(mockResult);

        await JazzCashController.initiateJazzCashAsync(req, res, next);

        expect(jazzCashService.initiateJazzCashPaymentAsync).toHaveBeenCalledWith(req.body, req.params.merchantId);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult));
    });

    it("should return an error response if payment initiation status is not pending", async () => {
        validationResult.mockReturnValueOnce({ isEmpty: () => true });
        const mockResult = { statusCode: 400, message: "Transaction Failed" };

        jazzCashService.initiateJazzCashPaymentAsync.mockResolvedValueOnce(mockResult);

        await JazzCashController.initiateJazzCashAsync(req, res, next);

        expect(jazzCashService.initiateJazzCashPaymentAsync).toHaveBeenCalledWith(req.body, req.params.merchantId);
        expect(res.status).toHaveBeenCalledWith(mockResult.statusCode);
        expect(res.send).toHaveBeenCalledWith(ApiResponse.error(mockResult));
    });

    it("should call next with an error if an exception is thrown", async () => {
        validationResult.mockReturnValueOnce({ isEmpty: () => true });
        const mockError = new Error("Unexpected Error");

        jazzCashService.initiateJazzCashPaymentAsync.mockRejectedValueOnce(mockError);

        await JazzCashController.initiateJazzCashAsync(req, res, next);

        expect(next).toHaveBeenCalledWith(mockError);
    });
});
