import jazzCashService from "../../../../dist/services/paymentGateway/jazzCash.js";
import  JazzCashController  from "../../../../dist/controller/paymentGateway/jazzCash.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";

jest.mock("../../../../dist/services/paymentGateway/jazzCash.js");

describe("getJazzCashMerchant", () => {
    let req, res, next;

    beforeEach(() => {
        req = { query: { merchantId: "12345" } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should return 200 and success response when data is retrieved", async () => {
        const mockData = { id: "12345", name: "Test Merchant" };
        jazzCashService.getJazzCashMerchant.mockResolvedValue(mockData);

        await JazzCashController.getJazzCashMerchant(req, res, next);

        expect(jazzCashService.getJazzCashMerchant).toHaveBeenCalledWith(req.query);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockData));
    });

    it("should call next with an error when jazzCashService throws an error", async () => {
        const mockError = new Error("Service error");
        jazzCashService.getJazzCashMerchant.mockRejectedValue(mockError);

        await JazzCashController.getJazzCashMerchant(req, res, next);

        expect(jazzCashService.getJazzCashMerchant).toHaveBeenCalledWith(req.query);
        expect(next).toHaveBeenCalledWith(mockError);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });
});
