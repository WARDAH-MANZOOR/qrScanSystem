import  simpleDisburseInquiryController  from "../../../../dist/controller/paymentGateway/jazzCash.js";
import ApiResponse from "../../../../dist/utils/ApiResponse.js";
import { simpleGetToken, simpleCheckTransactionStatus } from "../../../../dist/services/paymentGateway/index.js";

jest.mock("../../../../dist/services/paymentGateway/index.js");


describe("simpleDisburseInquiryController", () => {
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
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'; // Reset environment variable before tests
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should return 200 and the transaction inquiry if successful", async () => {
        const mockToken = { access_token: "test-token" };
        const mockInquiry = { status: "Success", transactionId: "txn_001" };

        simpleGetToken.mockResolvedValue(mockToken);
        simpleCheckTransactionStatus.mockResolvedValue(mockInquiry);

        await simpleDisburseInquiryController.simpleDisburseInquiryController(req, res, next);

        expect(simpleGetToken).toHaveBeenCalledWith("123");
        expect(simpleCheckTransactionStatus).toHaveBeenCalledWith("test-token", req.body, "123");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(ApiResponse.success(mockInquiry));
    });

    it("should call next with an error if simpleGetToken fails", async () => {
        const mockError = new Error("Token fetch error");
        simpleGetToken.mockRejectedValue(mockError);

        await simpleDisburseInquiryController.simpleDisburseInquiryController(req, res, next);

        expect(simpleGetToken).toHaveBeenCalledWith("123");
        expect(simpleCheckTransactionStatus).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith(mockError);
    });

    it("should call next with an error if simpleCheckTransactionStatus fails", async () => {
        const mockToken = { access_token: "test-token" };
        const mockError = new Error("Transaction status error");

        simpleGetToken.mockResolvedValue(mockToken);
        simpleCheckTransactionStatus.mockRejectedValue(mockError);

        await simpleDisburseInquiryController.simpleDisburseInquiryController(req, res, next);

        expect(simpleGetToken).toHaveBeenCalledWith("123");
        expect(simpleCheckTransactionStatus).toHaveBeenCalledWith("test-token", req.body, "123");
        expect(next).toHaveBeenCalledWith(mockError);
    });
});
