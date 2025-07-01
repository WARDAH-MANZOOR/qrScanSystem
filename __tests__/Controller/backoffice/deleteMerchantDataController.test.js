import { backofficeService } from "../../../dist/services/index.js";
import backofficecontroller from "../../../dist/controller/backoffice/backoffice.js";
import ApiResponse from "../../../dist/utils/ApiResponse.js";
import CustomError from "../../../dist/utils/custom_error.js";

describe("deleteMerchantDataController", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it("should return 201 and success response when merchantId is provided", async () => {
        req.params.merchantId = "123";

        const mockResult = { success: true };
        backofficeService.deleteMerchantData = jest.fn().mockResolvedValue(mockResult);

        await backofficecontroller.deleteMerchantDataController(req, res, next);

        expect(backofficeService.deleteMerchantData).toHaveBeenCalledWith(123);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult));
    });

    it("should throw a 404 error if merchantId is not provided", async () => {
        await backofficecontroller.deleteMerchantDataController(req, res, next);

        expect(next).toHaveBeenCalledWith(new CustomError("Merchant Id must be given", 404));
    });

    it("should handle unexpected errors and pass them to next()", async () => {
        req.params.merchantId = "123";

        const mockError = new Error("Unexpected Error");
        backofficeService.deleteMerchantData = jest.fn().mockRejectedValue(mockError);

        await backofficecontroller.deleteMerchantDataController(req, res, next);

        expect(next).toHaveBeenCalledWith(mockError);
    });
});
