import { validationResult } from "express-validator";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import { easyPaisaService, swichService, transactionService } from "../../../../dist/services/index.js";
import easyPaisaController from "../../../../dist/controller/paymentGateway/easyPaisa.js";

// Mocking external services
jest.mock('../../../../dist/services/index.js', () => ({
    easyPaisaService: {
        getMerchantChannel: jest.fn(),
        initiateEasyPaisaAsync: jest.fn(),
    },
    swichService: {
        initiateSwichAsync: jest.fn(),
    },
    transactionService: {
        getMerchantChannel: jest.fn(), // Add this if missing
        convertPhoneNumber: jest.fn(),
    },
}));


jest.mock('../../../../dist/utils/ApiResponse.js');
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
describe("initiateEasyPaisaAsync", () => {
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

    it("should return an error if merchantId is not provided", async () => {
        req.params.merchantId = undefined;

        await easyPaisaController.initiateEasyPaisaAsync(req, res, next);

        // Ensure the response is an error due to missing merchantId
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant ID is required"));
    });

    it("should return an error if validation errors occur", async () => {
        // Mock validation errors
        validationResult.mockReturnValueOnce({
            isEmpty: jest.fn().mockReturnValueOnce(false),
            array: jest.fn().mockReturnValueOnce([{ msg: "Validation Error" }]),
        });

        await easyPaisaController.initiateEasyPaisaAsync(req, res, next);

        // Ensure the response is an error due to validation failure
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Validation Error"));
    });
    it("should initiate EasyPaisa for DIRECT channel and return success", async () => {
        transactionService.getMerchantChannel.mockResolvedValueOnce({ easypaisaPaymentMethod: "DIRECT" });
        const mockResult = { statusCode: "pending", data: "mockData" };
        easyPaisaService.initiateEasyPaisaAsync.mockResolvedValueOnce(mockResult);
    
        await easyPaisaController.initiateEasyPaisaAsync(req, res, next);
    
        expect(transactionService.getMerchantChannel).toHaveBeenCalledWith(req.params.merchantId);
        expect(easyPaisaService.initiateEasyPaisaAsync).toHaveBeenCalledWith(req.params.merchantId, req.body);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult));
    });



    it("should initiate Swich for non-DIRECT channel and return success", async () => {
        transactionService.getMerchantChannel.mockResolvedValueOnce({ easypaisaPaymentMethod: "SWICH" });
        const mockResult = { statusCode: "pending", data: "mockData" };
        swichService.initiateSwichAsync.mockResolvedValueOnce(mockResult);
        await easyPaisaController.initiateEasyPaisaAsync(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult));
    });

    
    it("should return an error if Swich initiation fails", async () => {
        const mockChannel = { easypaisaPaymentMethod: "SWICH" };
        const mockError = { statusCode: "5000", message: "Error" };

        // Mock the service responses
        easyPaisaService.getMerchantChannel.mockResolvedValueOnce(mockChannel);
        swichService.initiateSwichAsync.mockResolvedValueOnce(mockError);

        await easyPaisaController.initiateEasyPaisaAsync(req, res, next);

        // Ensure the response is an error
        expect(res.status).toHaveBeenCalledWith("5000");
        expect(res.send).toHaveBeenCalledWith(ApiResponse.error(mockError));
    });

    it("should call next with an error if there is an unexpected error", async () => {
        const mockError = new Error("Unexpected error");
        transactionService.getMerchantChannel.mockRejectedValueOnce(mockError);
        await easyPaisaController.initiateEasyPaisaAsync(req, res, next);
        expect(next).toHaveBeenCalledWith(mockError);
    });
});
