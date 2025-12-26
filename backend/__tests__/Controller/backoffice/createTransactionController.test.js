import { backofficeService } from "../../../dist/services/index.js";
import backofficecontroller from "../../../dist/controller/backoffice/backoffice.js";
import ApiResponse from "../../../dist/utils/ApiResponse.js";
import CustomError from "../../../dist/utils/custom_error.js";
describe("createTransactionController", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {},
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it("should return 201 and success response when all parameters are valid", async () => {
        req.params.merchantId = "123";
        req.body = {
            original_amount: 100,
            provider_name: "Provider A",
            provider_account: "1234567890",
            settlement: true
        };

        const mockResult = { transactionId: "tx123" };
        backofficeService.createTransactionService = jest.fn().mockResolvedValue(mockResult);

        await backofficecontroller.createTransactionController(req, res, next);

        expect(backofficeService.createTransactionService).toHaveBeenCalledWith(req.body, "123");
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult));
    });

    it("should throw a 404 error if merchantId is not provided", async () => {
        req.body = {
            original_amount: 100,
            provider_name: "Provider A",
            provider_account: "1234567890",
            settlement: true
        };

        await backofficecontroller.createTransactionController(req, res, next);

        expect(next).toHaveBeenCalledWith(new CustomError("Merchant Id must be given", 404));
    });

    it("should throw a 404 error if required body parameters are missing", async () => {
        req.params.merchantId = "123";
        req.body = {
            provider_name: "Provider A",
            settlement: true
        };

        await backofficecontroller.createTransactionController(req, res, next);

        expect(next).toHaveBeenCalledWith(new CustomError("original_amount, provider_name, provider_account and settlement must be given", 404));
    });

    it("should handle unexpected errors and pass them to next()", async () => {
        req.params.merchantId = "123";
        req.body = {
            original_amount: 100,
            provider_name: "Provider A",
            provider_account: "1234567890",
            settlement: true
        };

        const mockError = new Error("Unexpected Error");
        backofficeService.createTransactionService = jest.fn().mockRejectedValue(mockError);

        await backofficecontroller.createTransactionController(req, res, next);

        expect(next).toHaveBeenCalledWith(mockError);
    });
});
