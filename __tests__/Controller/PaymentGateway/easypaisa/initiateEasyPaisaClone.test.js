import { validationResult } from "express-validator";
import { easyPaisaService, swichService, transactionService } from "../../../../dist/services/index.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import EasypaisaController from "../../../../dist/controller/paymentGateway/easyPaisa.js";

jest.mock("../../../../dist/services/index.js", () => ({
    easyPaisaService: {
        initiateEasyPaisaClone: jest.fn(),
    },
    swichService: {
        initiateSwichClone: jest.fn(),
    },
    transactionService: {
        getMerchantChannel: jest.fn(),
        convertPhoneNumber: jest.fn(),
    },
}));

jest.mock("express-validator", () => ({
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
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });

describe("initiateEasyPaisaClone", () => {
    let req, res, next;

    beforeEach(() => {
        req = { params: {}, body: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
        next = jest.fn();
    });

    it("should return 400 if merchant ID is missing", async () => {
        await EasypaisaController.initiateEasyPaisaClone(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant ID is required"));
    });
   

    it("should return 400 if validation fails", async () => {
        req.params.merchantId = "merchant123";
        validationResult.mockReturnValue({ isEmpty: () => false, array: () => [{ msg: "Invalid input" }] });
        await EasypaisaController.initiateEasyPaisaClone(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error({ msg: "Invalid input" }));
    });

    it("should initiate EasyPaisa clone with DIRECT channel", async () => {
        req.params.merchantId = "merchant123";
        req.body = { amount: 1000, phone: "03123456789", email: "test@example.com", order_id: "123", type: "payment" };
        validationResult.mockReturnValue({ isEmpty: () => true });
        transactionService.getMerchantChannel.mockResolvedValue({ easypaisaPaymentMethod: "DIRECT" });
        easyPaisaService.initiateEasyPaisaClone.mockResolvedValue({ statusCode: "0000" });

        await EasypaisaController.initiateEasyPaisaClone(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success({ statusCode: "0000" }));
    });

    it("should initiate EasyPaisa clone with non-DIRECT channel", async () => {
        req.params.merchantId = "merchant123";
        req.body = { amount: 1000, phone: "03123456789", email: "test@example.com", order_id: "123", type: "payment" };
        validationResult.mockReturnValue({ isEmpty: () => true });
        transactionService.getMerchantChannel.mockResolvedValue({ easypaisaPaymentMethod: "OTHER" });
        transactionService.convertPhoneNumber.mockReturnValue("923123456789");
        swichService.initiateSwichClone.mockResolvedValue({ statusCode: "0000" });

        await EasypaisaController.initiateEasyPaisaClone(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success({ statusCode: "0000" }));
    });


    it("should handle unexpected errors", async () => {
        req.params.merchantId = "merchant123";
        validationResult.mockReturnValue({ isEmpty: () => true });
        transactionService.getMerchantChannel.mockRejectedValue(new Error("Internal Server Error"));

        await EasypaisaController.initiateEasyPaisaClone(req, res, next);

        expect(next).toHaveBeenCalledWith(new Error("Internal Server Error"));
    });
});
