import { validationResult } from "express-validator";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import { easyPaisaService, swichService, transactionService } from "../../../../dist/services/index.js";
import easyPaisaController from "../../../../dist/controller/paymentGateway/easyPaisa.js";

// Mocking external services
jest.mock("../../../../dist/utils/ApiResponse.js");
jest.mock("express-validator", () => ({
    validationResult: jest.fn().mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(true),
        array: jest.fn().mockReturnValue([]),
    }),
}));
jest.mock("../../../../dist/services/index.js", () => ({
    easyPaisaService: {
        initiateEasyPaisa: jest.fn(),
    },
    swichService: {
        initiateSwich: jest.fn(),
    },
    transactionService: {
        getMerchantChannel: jest.fn(),
        convertPhoneNumber: jest.fn(),
    },
}));

describe("initiateEasyPaisa", () => {
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
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
        };

        next = jest.fn();

        jest.clearAllMocks();
    });

    it("should return an error if merchantId is not provided", async () => {
        req.params.merchantId = undefined;

        await easyPaisaController.initiateEasyPaisa(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant ID is required"));
    });

    it("should return an error if validation errors occur", async () => {
        validationResult.mockReturnValueOnce({
            isEmpty: jest.fn().mockReturnValue(false),
            array: jest.fn().mockReturnValue([{ msg: "Validation Error" }]),
        });

        await easyPaisaController.initiateEasyPaisa(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error({ msg: "Validation Error" }));
    });

    it("should initiate EasyPaisa for DIRECT channel and return success", async () => {
        transactionService.getMerchantChannel.mockResolvedValueOnce({ easypaisaPaymentMethod: "DIRECT" });
        const mockResult = { statusCode: "0000", data: "mockData" };
        easyPaisaService.initiateEasyPaisa.mockResolvedValueOnce(mockResult);

        await easyPaisaController.initiateEasyPaisa(req, res, next);

        expect(transactionService.getMerchantChannel).toHaveBeenCalledWith(req.params.merchantId);
        expect(easyPaisaService.initiateEasyPaisa).toHaveBeenCalledWith(req.params.merchantId, req.body);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult));
    });

    it("should return an error if EasyPaisa initiation fails", async () => {
        transactionService.getMerchantChannel.mockResolvedValueOnce({ easypaisaPaymentMethod: "DIRECT" });
        const mockError = { statusCode: 201, message: "Error" }; // Change "4000" to 201
        easyPaisaService.initiateEasyPaisa.mockResolvedValueOnce(mockError);
    
        await easyPaisaController.initiateEasyPaisa(req, res, next);
    
        expect(transactionService.getMerchantChannel).toHaveBeenCalledWith(req.params.merchantId);
        expect(easyPaisaService.initiateEasyPaisa).toHaveBeenCalledWith(req.params.merchantId, req.body);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(ApiResponse.error(mockError, 201));
    });
    

    it("should initiate Swich for non-DIRECT channel and return success", async () => {
        transactionService.getMerchantChannel.mockResolvedValueOnce({ easypaisaPaymentMethod: "SWICH" });
        transactionService.convertPhoneNumber.mockReturnValueOnce("convertedPhone");
        const mockResult = { statusCode: "0000", data: "mockData" };
        swichService.initiateSwich.mockResolvedValueOnce(mockResult);

        await easyPaisaController.initiateEasyPaisa(req, res, next);

        expect(transactionService.getMerchantChannel).toHaveBeenCalledWith(req.params.merchantId);
        expect(transactionService.convertPhoneNumber).toHaveBeenCalledWith(req.body.phone);
        expect(swichService.initiateSwich).toHaveBeenCalledWith({
            channel: 1749,
            amount: req.body.amount,
            phone: "convertedPhone",
            email: req.body.email,
            order_id: req.body.order_id,
            type: req.body.type,
        }, req.params.merchantId);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult));
    });

    it("should return an error if Swich initiation fails", async () => {
        transactionService.getMerchantChannel.mockResolvedValueOnce({ easypaisaPaymentMethod: "SWICH" });
        transactionService.convertPhoneNumber.mockReturnValueOnce("convertedPhone");
        const mockError = { statusCode: 201, message: "Error" }; // Change "5000" to 201
        swichService.initiateSwich.mockResolvedValueOnce(mockError);
    
        await easyPaisaController.initiateEasyPaisa(req, res, next);
    
        expect(transactionService.getMerchantChannel).toHaveBeenCalledWith(req.params.merchantId);
        expect(swichService.initiateSwich).toHaveBeenCalledWith({
            channel: 1749,
            amount: req.body.amount,
            phone: "convertedPhone",
            email: req.body.email,
            order_id: req.body.order_id,
            type: req.body.type,
        }, req.params.merchantId);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(ApiResponse.error(mockError, 201));
    });
    

    it("should call next with an error if there is an unexpected error", async () => {
        const mockError = new Error("Unexpected error");
        transactionService.getMerchantChannel.mockRejectedValueOnce(mockError);

        await easyPaisaController.initiateEasyPaisa(req, res, next);

        expect(next).toHaveBeenCalledWith(mockError);
    });
});