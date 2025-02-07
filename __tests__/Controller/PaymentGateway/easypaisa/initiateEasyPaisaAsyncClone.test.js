import { validationResult } from "express-validator";
import { easyPaisaService, swichService, transactionService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import EasypaisaController from "../../../../dist/controller/paymentGateway/easyPaisa.js";

jest.mock("../../../../dist/services/index.js", () => ({
    easyPaisaService: {
        initiateEasyPaisaAsyncClone: jest.fn(),
        initiateEasyPaisaClone: jest.fn(), // Add this

    },
    swichService: {
        initiateSwichAsyncClone: jest.fn(),
    },
    transactionService: {
        getMerchantChannel: jest.fn(),
        convertPhoneNumber: jest.fn(),
    },
}));

jest.mock("express-validator", () => ({
    validationResult: jest.fn(),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

const mockRequest = (params, body) => ({ params, body });
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

describe("initiateEasyPaisaAsyncClone", () => {
    let req, res, next;

    beforeEach(() => {
        res = mockResponse();
        next = jest.fn();
    });

    it("should return 400 if merchant ID is missing", async () => {
        req = mockRequest({}, {});
        await EasypaisaController.initiateEasyPaisaAsyncClone(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant ID is required"));
    });

    it("should return 400 if validation fails", async () => {
        req = mockRequest({ merchantId: "123" }, {});
        validationResult.mockReturnValue({ isEmpty: () => false, array: () => [{ msg: "Invalid input" }] });

        await EasypaisaController.initiateEasyPaisaAsyncClone(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error({ msg: "Invalid input" }));
    });
    it("should initiate EasyPaisa Async clone with DIRECT channel", async () => {
        req.params.merchantId = "merchant123";
        req.body = { amount: 1000, phone: "03123456789", email: "test@example.com" };
        validationResult.mockReturnValue({ isEmpty: () => true });
        transactionService.getMerchantChannel.mockResolvedValue({ easypaisaPaymentMethod: "DIRECT" });
        easyPaisaService.initiateEasyPaisaAsyncClone.mockResolvedValue({ statusCode: "pending" });
        await EasypaisaController.initiateEasyPaisaAsyncClone(req, res, next);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success({ statusCode: "pending" }));
    });
    
 
    it("should initiate EasyPaisa Async Clone with non-DIRECT channel", async () => {
        req = mockRequest({ merchantId: "123" }, { amount: 1000, phone: "1234567890", email: "test@example.com" });
        transactionService.getMerchantChannel.mockResolvedValue({ easypaisaPaymentMethod: "NON_DIRECT" });
        transactionService.convertPhoneNumber.mockReturnValue("923001234567");
        swichService.initiateSwichAsyncClone.mockResolvedValue({ statusCode: "pending" });

        await EasypaisaController.initiateEasyPaisaAsyncClone(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success({ statusCode: "pending" }));
    });

 
    it("should handle unexpected errors", async () => {
            req.params.merchantId = "merchant123";
            validationResult.mockReturnValue({ isEmpty: () => true });
            transactionService.getMerchantChannel.mockRejectedValue(new Error("Internal Server Error"));

            await EasypaisaController.initiateEasyPaisaAsyncClone(req, res, next);

            expect(next).toHaveBeenCalledWith(new Error("Internal Server Error"));
        });
    
});
