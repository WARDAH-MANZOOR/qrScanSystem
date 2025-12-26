import jazzCashService from "../../../../dist/services/paymentGateway/jazzCash.js";
import JazzCashController from "../../../../dist/controller/paymentGateway/jazzCash.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";

jest.mock("../../../../dist/services/paymentGateway/jazzCash.js");

describe("jazzStatusInquiry", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: { merchantId: "123" },
            body: { transactionId: "txn_001" },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should return 400 if merchantId is missing", async () => {
        req.params.merchantId = undefined; // Simulating missing merchantId

        await JazzCashController.jazzStatusInquiry(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.error("Merchant ID is required"));
        expect(jazzCashService.statusInquiry).not.toHaveBeenCalled(); // Ensure service is not called
    });

    it("should return 200 and the result if the service call is successful", async () => {
        const mockResult = { status: "Success", statusCode: 200 };
        jazzCashService.statusInquiry.mockResolvedValue(mockResult);

        await JazzCashController.jazzStatusInquiry(req, res, next);

        expect(jazzCashService.statusInquiry).toHaveBeenCalledWith(req.body, "123");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult, "", 200));
    });

    it("should return 201 if the service returns statusCode 500", async () => {
        const mockResult = { status: "Failed", statusCode: 500 };
        jazzCashService.statusInquiry.mockResolvedValue(mockResult);

        await JazzCashController.jazzStatusInquiry(req, res, next);

        expect(jazzCashService.statusInquiry).toHaveBeenCalledWith(req.body, "123");
        expect(res.status).toHaveBeenCalledWith(200); // Controller sends 200 but inside, it sends 201
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockResult, "", 201));
    });

    it("should call next with error when service throws an error", async () => {
        const mockError = new Error("Service failure");
        jazzCashService.statusInquiry.mockRejectedValue(mockError);

        await JazzCashController.jazzStatusInquiry(req, res, next);

        expect(jazzCashService.statusInquiry).toHaveBeenCalledWith(req.body, "123");
        expect(next).toHaveBeenCalledWith(mockError);
        expect(res.status).not.toHaveBeenCalled(); // Ensure response is not sent
        expect(res.json).not.toHaveBeenCalled();
    });
});
